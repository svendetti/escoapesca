BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE TABLE public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id bigint NOT NULL REFERENCES public.app_events(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'pending',
  attempt_count smallint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  sent_at timestamptz,
  provider_message_id text,
  dedupe_key text NOT NULL UNIQUE,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_outbox_event_recipient_channel_unique
    UNIQUE (event_id, recipient_user_id, channel),
  CONSTRAINT email_outbox_channel_check
    CHECK (channel = 'email'),
  CONSTRAINT email_outbox_status_check
    CHECK (status IN ('pending', 'processing', 'retry', 'sent', 'failed')),
  CONSTRAINT email_outbox_attempt_count_check
    CHECK (attempt_count BETWEEN 0 AND 5),
  CONSTRAINT email_outbox_last_error_length
    CHECK (last_error IS NULL OR char_length(last_error) <= 2000),
  CONSTRAINT email_outbox_provider_message_id_length
    CHECK (provider_message_id IS NULL OR char_length(provider_message_id) <= 255),
  CONSTRAINT email_outbox_sent_consistency
    CHECK (status <> 'sent' OR sent_at IS NOT NULL)
);

CREATE INDEX email_outbox_due_idx
ON public.email_outbox (next_attempt_at, created_at)
WHERE status IN ('pending', 'retry');

CREATE INDEX email_outbox_stale_processing_idx
ON public.email_outbox (claimed_at)
WHERE status = 'processing';

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_outbox
FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.email_outbox
IS 'Stato separato e idempotente del delivery email derivato dagli app_events; non contiene indirizzi email.';

UPDATE public.notifications
SET
  email_status = 'skipped',
  email_attempts = 0
WHERE email_status IN ('pending', 'failed')
  AND email_sent_at IS NULL;

ALTER TABLE public.notifications
ALTER COLUMN email_status SET DEFAULT 'skipped';

COMMENT ON COLUMN public.notifications.email_status
IS 'Campo legacy non usato dal delivery: lo stato email autorevole è public.email_outbox.status.';

CREATE FUNCTION private.enqueue_email_delivery_after_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.event_id IS NULL
    OR NEW.notification_type NOT IN (
      'participation_requested',
      'participation_cancelled',
      'participation_accepted',
      'participation_rejected',
      'trip_confirmed',
      'trip_cancelled',
      'trip_updated',
      'trip_private_details_updated'
    )
  THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.email_outbox (
      event_id,
      recipient_user_id,
      channel,
      dedupe_key
    )
    VALUES (
      NEW.event_id,
      NEW.user_id,
      'email',
      format('event:%s:user:%s:channel:email', NEW.event_id, NEW.user_id)
    )
    ON CONFLICT (event_id, recipient_user_id, channel) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Email outbox enqueue failed for notification %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enqueue_email_delivery_after_notification()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notifications_enqueue_email_delivery
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION private.enqueue_email_delivery_after_notification();

CREATE FUNCTION public.claim_email_deliveries(p_limit integer DEFAULT 10)
RETURNS TABLE (
  delivery_id uuid,
  event_type text,
  recipient_user_id uuid,
  trip_id uuid,
  trip_title text,
  actor_name text,
  attempt_count smallint
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25);
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Worker non autorizzato' USING ERRCODE = '42501';
  END IF;

  UPDATE public.email_outbox AS delivery
  SET
    status = CASE WHEN delivery.attempt_count >= 5 THEN 'failed' ELSE 'retry' END,
    next_attempt_at = CASE
      WHEN delivery.attempt_count >= 5 THEN delivery.next_attempt_at
      ELSE clock_timestamp()
    END,
    last_error = 'Worker interrotto prima del completamento',
    claimed_at = NULL,
    updated_at = clock_timestamp()
  WHERE delivery.status = 'processing'
    AND delivery.claimed_at < clock_timestamp() - interval '15 minutes';

  RETURN QUERY
  WITH selected AS (
    SELECT delivery.id
    FROM public.email_outbox AS delivery
    WHERE delivery.status IN ('pending', 'retry')
      AND delivery.next_attempt_at <= clock_timestamp()
      AND delivery.attempt_count < 5
    ORDER BY delivery.next_attempt_at, delivery.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT normalized_limit
  ), claimed AS (
    UPDATE public.email_outbox AS delivery
    SET
      status = 'processing',
      attempt_count = delivery.attempt_count + 1,
      claimed_at = clock_timestamp(),
      updated_at = clock_timestamp()
    FROM selected
    WHERE delivery.id = selected.id
    RETURNING delivery.*
  )
  SELECT
    claimed.id,
    event.event_type,
    claimed.recipient_user_id,
    event.trip_id,
    trip.title,
    actor.display_name,
    claimed.attempt_count
  FROM claimed
  JOIN public.app_events AS event
    ON event.id = claimed.event_id
  LEFT JOIN public.fishing_trips AS trip
    ON trip.id = event.trip_id
  LEFT JOIN public.app_users AS actor
    ON actor.id = event.actor_user_id
  ORDER BY claimed.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_email_deliveries(integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_deliveries(integer)
TO service_role;

CREATE FUNCTION public.complete_email_delivery(
  p_delivery_id uuid,
  p_success boolean,
  p_provider_message_id text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS TABLE (
  delivery_status text,
  retry_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Worker non autorizzato' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE public.email_outbox AS delivery
  SET
    status = CASE
      WHEN p_success THEN 'sent'
      WHEN delivery.attempt_count >= 5 THEN 'failed'
      ELSE 'retry'
    END,
    next_attempt_at = CASE
      WHEN p_success OR delivery.attempt_count >= 5 THEN delivery.next_attempt_at
      ELSE clock_timestamp()
        + make_interval(mins => power(2, LEAST(delivery.attempt_count, 5))::integer)
    END,
    last_error = CASE
      WHEN p_success THEN NULL
      ELSE left(COALESCE(NULLIF(p_error, ''), 'Errore provider non specificato'), 2000)
    END,
    sent_at = CASE WHEN p_success THEN clock_timestamp() ELSE NULL END,
    provider_message_id = CASE
      WHEN p_success THEN left(NULLIF(p_provider_message_id, ''), 255)
      ELSE delivery.provider_message_id
    END,
    claimed_at = NULL,
    updated_at = clock_timestamp()
  WHERE delivery.id = p_delivery_id
    AND delivery.status = 'processing'
  RETURNING delivery.status, delivery.next_attempt_at;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_email_delivery(uuid, boolean, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_email_delivery(uuid, boolean, text, text)
TO service_role;

CREATE FUNCTION private.invoke_email_outbox_worker()
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  project_url text;
  publishable_key text;
  request_id bigint;
BEGIN
  SELECT secret.decrypted_secret
  INTO project_url
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'escoapesca_project_url';

  SELECT secret.decrypted_secret
  INTO publishable_key
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'escoapesca_publishable_key';

  IF project_url IS NULL OR publishable_key IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/process-email-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || publishable_key,
      'apikey', publishable_key
    ),
    body := jsonb_build_object('batch_size', 10),
    timeout_milliseconds := 10000
  )
  INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION private.invoke_email_outbox_worker()
FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'escoapesca-process-email-outbox'
  ) THEN
    PERFORM cron.schedule(
      'escoapesca-process-email-outbox',
      '* * * * *',
      'SELECT private.invoke_email_outbox_worker();'
    );
  END IF;
END;
$$;

COMMIT;
