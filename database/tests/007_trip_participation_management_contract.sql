DO $$
DECLARE
  decision_definition text;
  confirmation_definition text;
BEGIN
  IF to_regprocedure('public.list_trip_participation_requests(uuid)') IS NULL
     OR to_regprocedure('public.decide_trip_participation(uuid,text)') IS NULL
     OR to_regprocedure('public.confirm_fishing_trip(uuid)') IS NULL THEN
    RAISE EXCEPTION 'RPC di gestione partecipazioni mancanti';
  END IF;

  IF NOT has_function_privilege(
    'authenticated', 'public.list_trip_participation_requests(uuid)', 'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated', 'public.decide_trip_participation(uuid,text)', 'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated', 'public.confirm_fishing_trip(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated non può eseguire le RPC di gestione';
  END IF;

  IF has_function_privilege(
    'anon', 'public.list_trip_participation_requests(uuid)', 'EXECUTE'
  ) OR has_function_privilege(
    'anon', 'public.decide_trip_participation(uuid,text)', 'EXECUTE'
  ) OR has_function_privilege(
    'anon', 'public.confirm_fishing_trip(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Anon non deve eseguire le RPC di gestione';
  END IF;

  IF has_table_privilege('authenticated', 'public.trip_participants', 'UPDATE') THEN
    RAISE EXCEPTION 'Le decisioni non devono usare UPDATE diretto dal client';
  END IF;

  SELECT pg_get_functiondef('public.decide_trip_participation(uuid,text)'::regprocedure)
  INTO decision_definition;
  SELECT pg_get_functiondef('public.confirm_fishing_trip(uuid)'::regprocedure)
  INTO confirmation_definition;

  IF position('FOR UPDATE OF trip, participant' IN decision_definition) = 0
     OR position('trip.organizer_user_id = authenticated_user_id' IN decision_definition) = 0
     OR position('reserved_places >= selected_max_participants - 1' IN decision_definition) = 0 THEN
    RAISE EXCEPTION 'Decisione priva di lock, autorizzazione o controllo capienza';
  END IF;

  IF position('accepted_count < 1' IN confirmation_definition) = 0
     OR position('status = ''confirmed''' IN confirmation_definition) = 0
     OR position('status = ''rejected''' IN confirmation_definition) = 0 THEN
    RAISE EXCEPTION 'Conferma priva delle transizioni richieste';
  END IF;

  IF NOT (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'public.list_trip_participation_requests(uuid)'::regprocedure
  ) OR NOT (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'public.decide_trip_participation(uuid,text)'::regprocedure
  ) OR NOT (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'public.confirm_fishing_trip(uuid)'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Le RPC devono applicare i controlli espliciti nel confine privilegiato';
  END IF;
END;
$$;
