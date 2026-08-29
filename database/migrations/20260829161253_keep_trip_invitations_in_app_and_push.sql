BEGIN;

CREATE OR REPLACE FUNCTION private.enqueue_email_delivery_after_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NEW.event_id IS NULL OR NEW.notification_type NOT IN (
    'participation_requested', 'participation_cancelled', 'participation_accepted',
    'participation_rejected', 'trip_confirmed', 'trip_cancelled', 'trip_updated',
    'trip_private_details_updated', 'feedback_requested', 'feedback_reminder'
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

COMMIT;
