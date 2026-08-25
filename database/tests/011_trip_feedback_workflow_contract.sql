BEGIN;

DO $$
DECLARE
  list_definition text;
  submit_definition text;
BEGIN
  IF to_regprocedure('public.list_my_trip_feedback()') IS NULL THEN
    RAISE EXCEPTION 'Manca list_my_trip_feedback()';
  END IF;

  IF to_regprocedure('public.submit_trip_feedback(uuid,boolean,boolean,boolean,smallint,text)') IS NULL THEN
    RAISE EXCEPTION 'Manca submit_trip_feedback(...)';
  END IF;

  SELECT pg_get_functiondef('public.list_my_trip_feedback()'::regprocedure)
  INTO list_definition;

  SELECT pg_get_functiondef(
    'public.submit_trip_feedback(uuid,boolean,boolean,boolean,smallint,text)'::regprocedure
  )
  INTO submit_definition;

  IF position('feedback.author_user_id = authenticated_user_id' IN list_definition) = 0 THEN
    RAISE EXCEPTION 'La lettura deve essere limitata ai feedback dell’utente autenticato';
  END IF;

  IF position('target_trip.status NOT IN (''confirmed'', ''completed'')' IN submit_definition) = 0
    OR position('target_trip.ends_at > now()' IN submit_definition) = 0
  THEN
    RAISE EXCEPTION 'L’invio deve richiedere uscita confermata e già terminata';
  END IF;

  IF position('participant.status IN (''confirmed'', ''completed'')' IN submit_definition) = 0 THEN
    RAISE EXCEPTION 'Solo i partecipanti confermati o completati possono inviare feedback';
  END IF;

  IF position(
    'ON CONFLICT ON CONSTRAINT trip_feedback_trip_author_unique DO NOTHING'
    IN submit_definition
  ) = 0 THEN
    RAISE EXCEPTION 'Il feedback deve rimanere univoco per utente e uscita';
  END IF;

  IF has_function_privilege('anon', 'public.list_my_trip_feedback()', 'EXECUTE')
    OR has_function_privilege(
      'anon',
      'public.submit_trip_feedback(uuid,boolean,boolean,boolean,smallint,text)',
      'EXECUTE'
    )
  THEN
    RAISE EXCEPTION 'Le funzioni feedback non devono essere eseguibili da anon';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.list_my_trip_feedback()', 'EXECUTE')
    OR NOT has_function_privilege(
      'authenticated',
      'public.submit_trip_feedback(uuid,boolean,boolean,boolean,smallint,text)',
      'EXECUTE'
    )
  THEN
    RAISE EXCEPTION 'Le funzioni feedback devono essere eseguibili dagli utenti autenticati';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.trip_feedback'::regclass
      AND conname = 'trip_feedback_trip_author_unique'
  ) THEN
    RAISE EXCEPTION 'Manca l’unicità del feedback per utente e uscita';
  END IF;
END;
$$;

ROLLBACK;
