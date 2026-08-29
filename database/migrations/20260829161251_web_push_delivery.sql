BEGIN;

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  expiration_time bigint,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_length CHECK (char_length(endpoint) BETWEEN 20 AND 2048),
  CONSTRAINT push_subscriptions_endpoint_https CHECK (endpoint LIKE 'https://%'),
  CONSTRAINT push_subscriptions_p256dh_length CHECK (char_length(p256dh) BETWEEN 40 AND 255),
  CONSTRAINT push_subscriptions_auth_length CHECK (char_length(auth_secret) BETWEEN 10 AND 255),
  CONSTRAINT push_subscriptions_expiration_positive CHECK (expiration_time IS NULL OR expiration_time > 0)
);

CREATE INDEX push_subscriptions_user_enabled_idx ON public.push_subscriptions (user_id, enabled);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_subscriptions FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.push_subscriptions
IS 'Endpoint Web Push del dispositivo; accesso consentito soltanto tramite RPC proprietarie o service role.';

CREATE FUNCTION public.upsert_my_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_secret text,
  p_expiration_time bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  authenticated_user_id uuid := auth.uid();
  selected_id uuid;
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_users AS app_user
    WHERE app_user.id = authenticated_user_id AND app_user.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;
  IF p_endpoint IS NULL OR p_endpoint NOT LIKE 'https://%'
    OR char_length(p_endpoint) NOT BETWEEN 20 AND 2048
    OR char_length(COALESCE(p_p256dh, '')) NOT BETWEEN 40 AND 255
    OR char_length(COALESCE(p_auth_secret, '')) NOT BETWEEN 10 AND 255
  THEN
    RAISE EXCEPTION 'Sottoscrizione push non valida' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id, endpoint, p256dh, auth_secret, expiration_time, enabled
  ) VALUES (
    authenticated_user_id, p_endpoint, p_p256dh, p_auth_secret, p_expiration_time, true
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    p256dh = EXCLUDED.p256dh,
    auth_secret = EXCLUDED.auth_secret,
    expiration_time = EXCLUDED.expiration_time,
    enabled = true,
    updated_at = clock_timestamp()
  RETURNING id INTO selected_id;
  RETURN selected_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_my_push_subscription(text, text, text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_my_push_subscription(text, text, text, bigint) TO authenticated;

CREATE FUNCTION public.remove_my_push_subscription(p_endpoint text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  authenticated_user_id uuid := auth.uid();
  removed_count integer;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.push_subscriptions AS subscription
  WHERE subscription.user_id = authenticated_user_id AND subscription.endpoint = p_endpoint;
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RETURN removed_count > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.remove_my_push_subscription(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_my_push_subscription(text) TO authenticated;

CREATE TABLE public.push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  attempt_count smallint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_outbox_delivery_unique UNIQUE (notification_id, subscription_id),
  CONSTRAINT push_outbox_status_check CHECK (status IN ('pending', 'processing', 'retry', 'sent', 'failed')),
  CONSTRAINT push_outbox_attempts_check CHECK (attempt_count BETWEEN 0 AND 5),
  CONSTRAINT push_outbox_sent_consistency CHECK (status <> 'sent' OR sent_at IS NOT NULL)
);

CREATE INDEX push_outbox_pending_idx ON public.push_outbox (next_attempt_at, created_at)
WHERE status IN ('pending', 'retry');
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_outbox FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.enqueue_push_delivery_after_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.push_outbox (notification_id, subscription_id)
  SELECT NEW.id, subscription.id
  FROM public.push_subscriptions AS subscription
  WHERE subscription.user_id = NEW.user_id
    AND subscription.enabled
    AND (
      subscription.expiration_time IS NULL
      OR subscription.expiration_time > floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint
    )
  ON CONFLICT (notification_id, subscription_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push outbox enqueue failed for notification %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enqueue_push_delivery_after_notification() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notifications_enqueue_push_delivery
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION private.enqueue_push_delivery_after_notification();

CREATE FUNCTION public.claim_push_deliveries(p_limit integer DEFAULT 20)
RETURNS TABLE (
  delivery_id uuid, subscription_id uuid, endpoint text, p256dh text,
  auth_secret text, notification_type text, trip_id uuid,
  trip_title text, actor_name text, attempt_count smallint
)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  normalized_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Worker non autorizzato' USING ERRCODE = '42501';
  END IF;

  UPDATE public.push_outbox AS delivery SET
    status = CASE WHEN delivery.attempt_count >= 5 THEN 'failed' ELSE 'retry' END,
    next_attempt_at = CASE WHEN delivery.attempt_count >= 5 THEN delivery.next_attempt_at ELSE clock_timestamp() END,
    last_error = 'Worker interrotto prima del completamento',
    claimed_at = NULL,
    updated_at = clock_timestamp()
  WHERE delivery.status = 'processing'
    AND delivery.claimed_at < clock_timestamp() - interval '15 minutes';

  RETURN QUERY
  WITH selected AS (
    SELECT delivery.id
    FROM public.push_outbox AS delivery
    JOIN public.push_subscriptions AS subscription ON subscription.id = delivery.subscription_id
    WHERE delivery.status IN ('pending', 'retry')
      AND delivery.next_attempt_at <= clock_timestamp()
      AND delivery.attempt_count < 5
      AND subscription.enabled
    ORDER BY delivery.next_attempt_at, delivery.created_at
    FOR UPDATE OF delivery SKIP LOCKED
    LIMIT normalized_limit
  ), claimed AS (
    UPDATE public.push_outbox AS delivery SET
      status = 'processing', attempt_count = delivery.attempt_count + 1,
      claimed_at = clock_timestamp(), updated_at = clock_timestamp()
    FROM selected WHERE delivery.id = selected.id RETURNING delivery.*
  )
  SELECT
    claimed.id, subscription.id, subscription.endpoint, subscription.p256dh,
    subscription.auth_secret, notification.notification_type, notification.trip_id,
    notification.payload ->> 'trip_title', notification.payload ->> 'actor_name',
    claimed.attempt_count
  FROM claimed
  JOIN public.push_subscriptions AS subscription ON subscription.id = claimed.subscription_id
  JOIN public.notifications AS notification ON notification.id = claimed.notification_id
  ORDER BY claimed.created_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_push_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_deliveries(integer) TO service_role;

CREATE FUNCTION public.complete_push_delivery(
  p_delivery_id uuid,
  p_success boolean,
  p_permanent_failure boolean DEFAULT false,
  p_error text DEFAULT NULL
)
RETURNS TABLE (delivery_status text, retry_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  selected_subscription_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Worker non autorizzato' USING ERRCODE = '42501';
  END IF;
  SELECT delivery.subscription_id INTO selected_subscription_id
  FROM public.push_outbox AS delivery
  WHERE delivery.id = p_delivery_id AND delivery.status = 'processing';

  RETURN QUERY
  UPDATE public.push_outbox AS delivery SET
    status = CASE
      WHEN p_success THEN 'sent'
      WHEN p_permanent_failure OR delivery.attempt_count >= 5 THEN 'failed'
      ELSE 'retry'
    END,
    next_attempt_at = CASE
      WHEN p_success OR p_permanent_failure OR delivery.attempt_count >= 5 THEN delivery.next_attempt_at
      ELSE clock_timestamp() + make_interval(mins => power(2, LEAST(delivery.attempt_count, 5))::integer)
    END,
    last_error = CASE WHEN p_success THEN NULL ELSE left(COALESCE(NULLIF(p_error, ''), 'Errore push non specificato'), 2000) END,
    sent_at = CASE WHEN p_success THEN clock_timestamp() ELSE NULL END,
    claimed_at = NULL,
    updated_at = clock_timestamp()
  WHERE delivery.id = p_delivery_id AND delivery.status = 'processing'
  RETURNING delivery.status, delivery.next_attempt_at;

  IF p_permanent_failure AND selected_subscription_id IS NOT NULL THEN
    UPDATE public.push_subscriptions AS subscription
    SET enabled = false, updated_at = clock_timestamp()
    WHERE subscription.id = selected_subscription_id;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_push_delivery(uuid, boolean, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_push_delivery(uuid, boolean, boolean, text) TO service_role;

CREATE FUNCTION public.send_test_push_notification()
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  authenticated_user_id uuid := auth.uid();
  selected_notification_id uuid;
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_users AS app_user
    WHERE app_user.id = authenticated_user_id AND app_user.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.push_subscriptions AS subscription
    WHERE subscription.user_id = authenticated_user_id AND subscription.enabled
  ) THEN
    RAISE EXCEPTION 'Attiva prima le notifiche sul telefono' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.notifications AS notification
    WHERE notification.user_id = authenticated_user_id
      AND notification.notification_type = 'push_test'
      AND notification.created_at > clock_timestamp() - interval '1 minute'
  ) THEN
    RAISE EXCEPTION 'Attendi un minuto prima di inviare un’altra prova' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.notifications (user_id, notification_type, payload, dedupe_key)
  VALUES (
    authenticated_user_id, 'push_test', '{}'::jsonb,
    format('push-test:user:%s:minute:%s', authenticated_user_id, date_trunc('minute', clock_timestamp()))
  ) RETURNING id INTO selected_notification_id;
  RETURN selected_notification_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.send_test_push_notification() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_test_push_notification() TO authenticated;

COMMIT;
