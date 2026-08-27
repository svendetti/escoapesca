BEGIN;

CREATE UNIQUE INDEX app_events_feedback_prompt_unique
ON public.app_events (
  event_type,
  trip_id,
  ((payload ->> 'recipient_user_id'))
)
WHERE event_type IN ('feedback_requested', 'feedback_reminder');

CREATE OR REPLACE FUNCTION private.enqueue_email_delivery_after_notification()
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
      'trip_private_details_updated',
      'feedback_requested',
      'feedback_reminder'
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

CREATE OR REPLACE FUNCTION private.process_app_event(p_event_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_event public.app_events%ROWTYPE;
  organizer_id uuid;
  participant_user_id uuid;
  trip_title text;
  actor_name text;
  recipient_id uuid;
  notification_payload jsonb;
BEGIN
  SELECT event.*
  INTO selected_event
  FROM public.app_events AS event
  WHERE event.id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR selected_event.processed_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT trip.organizer_user_id, trip.title
  INTO organizer_id, trip_title
  FROM public.fishing_trips AS trip
  WHERE trip.id = selected_event.trip_id;

  SELECT participant.user_id
  INTO participant_user_id
  FROM public.trip_participants AS participant
  WHERE participant.id = selected_event.participant_id;

  SELECT app_user.display_name
  INTO actor_name
  FROM public.app_users AS app_user
  WHERE app_user.id = selected_event.actor_user_id;

  notification_payload := jsonb_strip_nulls(jsonb_build_object(
    'trip_title', trip_title,
    'actor_name', actor_name
  ));

  IF selected_event.event_type IN ('participation_requested', 'participation_cancelled') THEN
    IF organizer_id IS NOT NULL
       AND organizer_id IS DISTINCT FROM selected_event.actor_user_id THEN
      INSERT INTO public.notifications (
        user_id, event_id, trip_id, notification_type, payload, dedupe_key
      )
      VALUES (
        organizer_id,
        selected_event.id,
        selected_event.trip_id,
        selected_event.event_type,
        notification_payload,
        format('event:%s:user:%s', selected_event.id, organizer_id)
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  ELSIF selected_event.event_type IN ('participation_accepted', 'participation_rejected') THEN
    IF participant_user_id IS NOT NULL
       AND participant_user_id IS DISTINCT FROM selected_event.actor_user_id THEN
      INSERT INTO public.notifications (
        user_id, event_id, trip_id, notification_type, payload, dedupe_key
      )
      VALUES (
        participant_user_id,
        selected_event.id,
        selected_event.trip_id,
        selected_event.event_type,
        notification_payload,
        format('event:%s:user:%s', selected_event.id, participant_user_id)
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  ELSIF selected_event.event_type IN (
    'trip_confirmed',
    'trip_updated',
    'trip_cancelled',
    'trip_private_details_updated'
  ) THEN
    FOR recipient_id IN
      SELECT DISTINCT participant.user_id
      FROM public.trip_participants AS participant
      JOIN public.app_users AS app_user
        ON app_user.id = participant.user_id
       AND app_user.status = 'active'
      WHERE participant.trip_id = selected_event.trip_id
        AND participant.user_id IS DISTINCT FROM selected_event.actor_user_id
        AND (
          (
            selected_event.event_type IN ('trip_confirmed', 'trip_private_details_updated')
            AND participant.status IN ('confirmed', 'completed')
          )
          OR (
            selected_event.event_type IN ('trip_updated', 'trip_cancelled')
            AND participant.status IN ('requested', 'accepted', 'confirmed', 'completed')
          )
        )
    LOOP
      INSERT INTO public.notifications (
        user_id, event_id, trip_id, notification_type, payload, dedupe_key
      )
      VALUES (
        recipient_id,
        selected_event.id,
        selected_event.trip_id,
        selected_event.event_type,
        notification_payload,
        format('event:%s:user:%s', selected_event.id, recipient_id)
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END LOOP;
  ELSIF selected_event.event_type IN ('feedback_requested', 'feedback_reminder') THEN
    recipient_id := NULLIF(selected_event.payload ->> 'recipient_user_id', '')::uuid;

    IF recipient_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.app_users AS app_user
        WHERE app_user.id = recipient_id
          AND app_user.status = 'active'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.trip_feedback AS feedback
        WHERE feedback.trip_id = selected_event.trip_id
          AND feedback.author_user_id = recipient_id
      )
    THEN
      INSERT INTO public.notifications (
        user_id, event_id, trip_id, notification_type, payload, dedupe_key
      )
      VALUES (
        recipient_id,
        selected_event.id,
        selected_event.trip_id,
        selected_event.event_type,
        notification_payload,
        format('event:%s:user:%s', selected_event.id, recipient_id)
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  END IF;

  UPDATE public.app_events AS event
  SET
    processed_at = clock_timestamp(),
    processing_attempts = event.processing_attempts + 1
  WHERE event.id = selected_event.id;
END;
$$;

REVOKE ALL ON FUNCTION private.process_app_event(bigint)
FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.enqueue_due_feedback_prompts(
  p_now timestamptz DEFAULT clock_timestamp(),
  p_initial_delay interval DEFAULT interval '3 hours',
  p_reminder_delay interval DEFAULT interval '48 hours'
)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  initial_count integer := 0;
  reminder_count integer := 0;
BEGIN
  IF p_initial_delay < interval '0 seconds'
    OR p_reminder_delay < interval '0 seconds'
  THEN
    RAISE EXCEPTION 'I delay feedback non possono essere negativi'
      USING ERRCODE = '22023';
  END IF;

  WITH eligible_recipients AS (
    SELECT trip.id AS trip_id, trip.organizer_user_id AS recipient_user_id
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS app_user
      ON app_user.id = trip.organizer_user_id
     AND app_user.status = 'active'
    WHERE trip.status IN ('confirmed', 'completed')
      AND trip.ends_at <= p_now - p_initial_delay

    UNION

    SELECT trip.id, participant.user_id
    FROM public.fishing_trips AS trip
    JOIN public.trip_participants AS participant
      ON participant.trip_id = trip.id
     AND participant.status IN ('confirmed', 'completed')
    JOIN public.app_users AS app_user
      ON app_user.id = participant.user_id
     AND app_user.status = 'active'
    WHERE trip.status IN ('confirmed', 'completed')
      AND trip.ends_at <= p_now - p_initial_delay
  )
  INSERT INTO public.app_events (
    event_type,
    actor_user_id,
    trip_id,
    payload,
    occurred_at
  )
  SELECT
    'feedback_requested',
    NULL,
    eligible.trip_id,
    jsonb_build_object('recipient_user_id', eligible.recipient_user_id),
    p_now
  FROM eligible_recipients AS eligible
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.trip_feedback AS feedback
    WHERE feedback.trip_id = eligible.trip_id
      AND feedback.author_user_id = eligible.recipient_user_id
  )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS initial_count = ROW_COUNT;

  WITH eligible_recipients AS (
    SELECT trip.id AS trip_id, trip.organizer_user_id AS recipient_user_id
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS app_user
      ON app_user.id = trip.organizer_user_id
     AND app_user.status = 'active'
    WHERE trip.status IN ('confirmed', 'completed')

    UNION

    SELECT trip.id, participant.user_id
    FROM public.fishing_trips AS trip
    JOIN public.trip_participants AS participant
      ON participant.trip_id = trip.id
     AND participant.status IN ('confirmed', 'completed')
    JOIN public.app_users AS app_user
      ON app_user.id = participant.user_id
     AND app_user.status = 'active'
    WHERE trip.status IN ('confirmed', 'completed')
  ),
  initial_prompts AS (
    SELECT
      event.trip_id,
      (event.payload ->> 'recipient_user_id')::uuid AS recipient_user_id,
      event.occurred_at
    FROM public.app_events AS event
    WHERE event.event_type = 'feedback_requested'
      AND event.occurred_at <= p_now - p_reminder_delay
  )
  INSERT INTO public.app_events (
    event_type,
    actor_user_id,
    trip_id,
    payload,
    occurred_at
  )
  SELECT
    'feedback_reminder',
    NULL,
    eligible.trip_id,
    jsonb_build_object('recipient_user_id', eligible.recipient_user_id),
    p_now
  FROM eligible_recipients AS eligible
  JOIN initial_prompts AS initial
    ON initial.trip_id = eligible.trip_id
   AND initial.recipient_user_id = eligible.recipient_user_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.trip_feedback AS feedback
    WHERE feedback.trip_id = eligible.trip_id
      AND feedback.author_user_id = eligible.recipient_user_id
  )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS reminder_count = ROW_COUNT;
  RETURN initial_count + reminder_count;
END;
$$;

COMMENT ON FUNCTION private.enqueue_due_feedback_prompts(timestamptz, interval, interval)
IS 'Accoda una richiesta feedback tre ore dopo la fine e al massimo un reminder dopo 48 ore, senza timer browser.';

REVOKE ALL ON FUNCTION private.enqueue_due_feedback_prompts(timestamptz, interval, interval)
FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'escoapesca-enqueue-feedback-prompts'
  ) THEN
    PERFORM cron.schedule(
      'escoapesca-enqueue-feedback-prompts',
      '*/15 * * * *',
      'SELECT private.enqueue_due_feedback_prompts();'
    );
  END IF;
END;
$$;

COMMIT;
