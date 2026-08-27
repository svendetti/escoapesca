BEGIN;

DO $$
DECLARE
  scheduler_definition text;
  processor_definition text;
  email_enqueue_definition text;
BEGIN
  IF to_regprocedure(
    'private.enqueue_due_feedback_prompts(timestamptz,interval,interval)'
  ) IS NULL THEN
    RAISE EXCEPTION 'feedback prompt scheduler is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'app_events'
      AND indexname = 'app_events_feedback_prompt_unique'
      AND indexdef ILIKE '%feedback_requested%'
      AND indexdef ILIKE '%feedback_reminder%'
      AND indexdef ILIKE '%recipient_user_id%'
  ) THEN
    RAISE EXCEPTION 'feedback prompt idempotency index is missing';
  END IF;

  SELECT pg_get_functiondef(
    'private.enqueue_due_feedback_prompts(timestamptz,interval,interval)'::regprocedure
  )
  INTO scheduler_definition;

  IF scheduler_definition NOT ILIKE '%03:00:00%'
    OR scheduler_definition NOT ILIKE '%48:00:00%'
    OR scheduler_definition NOT ILIKE '%ends_at <= p_now - p_initial_delay%'
    OR scheduler_definition NOT ILIKE '%status IN (''confirmed'', ''completed'')%'
    OR scheduler_definition NOT ILIKE '%participant.status IN (''confirmed'', ''completed'')%'
    OR scheduler_definition NOT ILIKE '%trip_feedback%'
    OR scheduler_definition NOT ILIKE '%ON CONFLICT DO NOTHING%'
  THEN
    RAISE EXCEPTION 'feedback timing, eligibility, suppression or idempotency is incomplete';
  END IF;

  SELECT pg_get_functiondef('private.process_app_event(bigint)'::regprocedure)
  INTO processor_definition;
  SELECT pg_get_functiondef(
    'private.enqueue_email_delivery_after_notification()'::regprocedure
  )
  INTO email_enqueue_definition;

  IF processor_definition NOT ILIKE '%feedback_requested%'
    OR processor_definition NOT ILIKE '%feedback_reminder%'
    OR processor_definition NOT ILIKE '%recipient_user_id%'
    OR processor_definition NOT ILIKE '%trip_feedback%'
  THEN
    RAISE EXCEPTION 'feedback events are not safely converted to notifications';
  END IF;

  IF email_enqueue_definition NOT ILIKE '%feedback_requested%'
    OR email_enqueue_definition NOT ILIKE '%feedback_reminder%'
  THEN
    RAISE EXCEPTION 'feedback prompts do not use the P0.8 delivery layer';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'private.enqueue_due_feedback_prompts(timestamptz,interval,interval)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'private.enqueue_due_feedback_prompts(timestamptz,interval,interval)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'feedback scheduler is exposed to API roles';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'escoapesca-enqueue-feedback-prompts'
      AND active
  ) THEN
    RAISE EXCEPTION 'feedback prompt cron job is not active';
  END IF;
END;
$$;

DO $$
DECLARE
  test_now timestamptz := '2026-08-27 12:00:00+00';
  target_trip_id uuid;
  organizer_id uuid;
  eligible_count integer;
  created_count integer;
BEGIN
  SELECT trip.id, trip.organizer_user_id
  INTO target_trip_id, organizer_id
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
   AND organizer.status = 'active'
  WHERE EXISTS (
    SELECT 1
    FROM public.trip_participants AS participant
    JOIN public.app_users AS app_user
      ON app_user.id = participant.user_id
     AND app_user.status = 'active'
    WHERE participant.trip_id = trip.id
      AND participant.status IN ('confirmed', 'completed')
  )
  ORDER BY trip.created_at
  LIMIT 1;

  IF target_trip_id IS NULL THEN
    RAISE NOTICE 'dynamic feedback scheduler test skipped: no eligible fixture';
    RETURN;
  END IF;

  SELECT count(*)
  INTO eligible_count
  FROM (
    SELECT organizer_id AS user_id
    UNION
    SELECT participant.user_id
    FROM public.trip_participants AS participant
    JOIN public.app_users AS app_user
      ON app_user.id = participant.user_id
     AND app_user.status = 'active'
    WHERE participant.trip_id = target_trip_id
      AND participant.status IN ('confirmed', 'completed')
  ) AS eligible;

  DELETE FROM public.notifications
  WHERE trip_id = target_trip_id
    AND notification_type IN ('feedback_requested', 'feedback_reminder');
  DELETE FROM public.app_events
  WHERE trip_id = target_trip_id
    AND event_type IN ('feedback_requested', 'feedback_reminder');
  DELETE FROM public.trip_feedback
  WHERE trip_id = target_trip_id;

  UPDATE public.fishing_trips
  SET
    starts_at = test_now - interval '8 hours',
    ends_at = test_now - interval '2 hours',
    status = 'confirmed',
    confirmed_at = COALESCE(confirmed_at, test_now - interval '1 day')
  WHERE id = target_trip_id;

  SELECT private.enqueue_due_feedback_prompts(
    test_now,
    interval '3 hours',
    interval '48 hours'
  )
  INTO created_count;

  IF created_count <> 0 THEN
    RAISE EXCEPTION 'feedback prompt was sent before the initial delay';
  END IF;

  UPDATE public.fishing_trips
  SET ends_at = test_now - interval '4 hours'
  WHERE id = target_trip_id;

  SELECT private.enqueue_due_feedback_prompts(
    test_now,
    interval '3 hours',
    interval '48 hours'
  )
  INTO created_count;

  IF created_count <> eligible_count THEN
    RAISE EXCEPTION 'initial prompt recipients are incorrect: expected %, got %',
      eligible_count, created_count;
  END IF;

  SELECT private.enqueue_due_feedback_prompts(
    test_now,
    interval '3 hours',
    interval '48 hours'
  )
  INTO created_count;

  IF created_count <> 0 THEN
    RAISE EXCEPTION 'initial prompt job is not idempotent';
  END IF;

  UPDATE public.app_events
  SET occurred_at = test_now - interval '49 hours'
  WHERE trip_id = target_trip_id
    AND event_type = 'feedback_requested';

  INSERT INTO public.trip_feedback (
    trip_id,
    author_user_id,
    trip_happened,
    met_new_fisher,
    would_repeat,
    rating
  )
  VALUES (
    target_trip_id,
    organizer_id,
    true,
    true,
    true,
    5
  );

  SELECT private.enqueue_due_feedback_prompts(
    test_now,
    interval '3 hours',
    interval '48 hours'
  )
  INTO created_count;

  IF created_count <> eligible_count - 1 THEN
    RAISE EXCEPTION 'reminder recipients are incorrect: expected %, got %',
      eligible_count - 1, created_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.app_events AS event
    WHERE event.trip_id = target_trip_id
      AND event.event_type = 'feedback_reminder'
      AND event.payload ->> 'recipient_user_id' = organizer_id::text
  ) THEN
    RAISE EXCEPTION 'a user with feedback received a reminder';
  END IF;

  SELECT private.enqueue_due_feedback_prompts(
    test_now,
    interval '3 hours',
    interval '48 hours'
  )
  INTO created_count;

  IF created_count <> 0 THEN
    RAISE EXCEPTION 'more than one reminder was created';
  END IF;

  DELETE FROM public.notifications
  WHERE trip_id = target_trip_id
    AND notification_type IN ('feedback_requested', 'feedback_reminder');
  DELETE FROM public.app_events
  WHERE trip_id = target_trip_id
    AND event_type IN ('feedback_requested', 'feedback_reminder');
  DELETE FROM public.trip_feedback
  WHERE trip_id = target_trip_id;

  UPDATE public.fishing_trips
  SET
    status = 'cancelled',
    cancelled_at = test_now
  WHERE id = target_trip_id;

  SELECT private.enqueue_due_feedback_prompts(
    test_now,
    interval '3 hours',
    interval '48 hours'
  )
  INTO created_count;

  IF created_count <> 0 THEN
    RAISE EXCEPTION 'cancelled trip generated feedback prompts';
  END IF;

  UPDATE public.fishing_trips
  SET
    status = 'open',
    cancelled_at = NULL,
    cancellation_reason = NULL
  WHERE id = target_trip_id;

  SELECT private.enqueue_due_feedback_prompts(
    test_now,
    interval '3 hours',
    interval '48 hours'
  )
  INTO created_count;

  IF created_count <> 0 THEN
    RAISE EXCEPTION 'never-confirmed trip generated feedback prompts';
  END IF;
END;
$$;

ROLLBACK;
