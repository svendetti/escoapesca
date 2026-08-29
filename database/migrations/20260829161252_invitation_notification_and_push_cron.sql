BEGIN;

CREATE FUNCTION private.create_trip_invitation_notification_after_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  recipient_id uuid;
  trip_title text;
  actor_name text;
BEGIN
  IF NEW.event_type <> 'trip_invitation_sent' THEN
    RETURN NEW;
  END IF;

  recipient_id := NULLIF(NEW.payload ->> 'recipient_user_id', '')::uuid;
  IF recipient_id IS NULL
    OR recipient_id IS NOT DISTINCT FROM NEW.actor_user_id
    OR NOT EXISTS (
      SELECT 1 FROM public.app_users AS app_user
      WHERE app_user.id = recipient_id AND app_user.status = 'active'
    )
  THEN
    RETURN NEW;
  END IF;

  SELECT trip.title INTO trip_title
  FROM public.fishing_trips AS trip WHERE trip.id = NEW.trip_id;
  SELECT app_user.display_name INTO actor_name
  FROM public.app_users AS app_user WHERE app_user.id = NEW.actor_user_id;

  INSERT INTO public.notifications (
    user_id, event_id, trip_id, notification_type, payload, dedupe_key
  ) VALUES (
    recipient_id,
    NEW.id,
    NEW.trip_id,
    NEW.event_type,
    jsonb_strip_nulls(jsonb_build_object('trip_title', trip_title, 'actor_name', actor_name)),
    format('event:%s:user:%s', NEW.id, recipient_id)
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.create_trip_invitation_notification_after_event()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER app_events_create_trip_invitation_notification
AFTER INSERT ON public.app_events
FOR EACH ROW EXECUTE FUNCTION private.create_trip_invitation_notification_after_event();

CREATE OR REPLACE FUNCTION private.enqueue_email_delivery_after_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NEW.event_id IS NULL OR NEW.notification_type NOT IN (
    'participation_requested', 'participation_cancelled', 'participation_accepted',
    'participation_rejected', 'trip_confirmed', 'trip_cancelled', 'trip_updated',
    'trip_private_details_updated', 'feedback_requested', 'feedback_reminder',
    'trip_invitation_sent'
  ) THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.email_outbox (event_id, recipient_user_id, channel, dedupe_key)
    VALUES (
      NEW.event_id, NEW.user_id, 'email',
      format('event:%s:user:%s:channel:email', NEW.event_id, NEW.user_id)
    )
    ON CONFLICT (event_id, recipient_user_id, channel) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Email outbox enqueue failed for notification %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.enqueue_email_delivery_after_notification()
FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.invoke_push_outbox_worker()
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  project_url text;
  publishable_key text;
  request_id bigint;
BEGIN
  SELECT secret.decrypted_secret INTO project_url
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'escoapesca_project_url';

  SELECT secret.decrypted_secret INTO publishable_key
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'escoapesca_publishable_key';

  IF project_url IS NULL OR publishable_key IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/process-push-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || publishable_key,
      'apikey', publishable_key
    ),
    body := jsonb_build_object('action', 'process', 'batch_size', 20),
    timeout_milliseconds := 10000
  ) INTO request_id;
  RETURN request_id;
END;
$function$;

REVOKE ALL ON FUNCTION private.invoke_push_outbox_worker()
FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'escoapesca-process-push-outbox',
  '* * * * *',
  'SELECT private.invoke_push_outbox_worker();'
);

COMMIT;
