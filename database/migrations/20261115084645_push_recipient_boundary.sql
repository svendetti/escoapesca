BEGIN;

CREATE OR REPLACE FUNCTION public.claim_push_deliveries(p_limit integer DEFAULT 20)
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

  -- A device may now belong to another account, or its recipient be disabled.
  -- Never send pending notices to the subscription's new owner.
  UPDATE public.push_outbox AS delivery SET
    status = 'failed', last_error = 'Destinatario o sottoscrizione non più autorizzati',
    claimed_at = NULL, updated_at = clock_timestamp()
  WHERE delivery.status IN ('pending', 'retry') AND NOT EXISTS (
    SELECT 1 FROM public.push_subscriptions AS subscription
    JOIN public.notifications AS notification ON notification.id = delivery.notification_id
    JOIN public.app_users AS recipient ON recipient.id = notification.user_id
    WHERE subscription.id = delivery.subscription_id
      AND subscription.user_id = notification.user_id
      AND recipient.status = 'active' AND subscription.enabled
      AND (subscription.expiration_time IS NULL OR subscription.expiration_time >
        floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint)
  );

  RETURN QUERY
  WITH selected AS (
    SELECT delivery.id
    FROM public.push_outbox AS delivery
    JOIN public.push_subscriptions AS subscription ON subscription.id = delivery.subscription_id
    JOIN public.notifications AS recipient_notification ON recipient_notification.id = delivery.notification_id
    JOIN public.app_users AS recipient ON recipient.id = recipient_notification.user_id
    WHERE delivery.status IN ('pending', 'retry')
      AND delivery.next_attempt_at <= clock_timestamp()
      AND delivery.attempt_count < 5
      AND subscription.enabled
      AND subscription.user_id = recipient_notification.user_id
      AND recipient.status = 'active'
      AND (subscription.expiration_time IS NULL OR subscription.expiration_time >
        floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint)
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


COMMIT;
