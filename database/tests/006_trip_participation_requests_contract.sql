DO $$
DECLARE
  select_policy_expression text;
BEGIN
  SELECT qual
  INTO select_policy_expression
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'trip_participants'
    AND policyname = 'trip_participants_select_own_or_organizer'
    AND cmd = 'SELECT'
    AND 'authenticated' = ANY (roles);

  IF select_policy_expression IS NULL
     OR position('auth.uid()' IN select_policy_expression) = 0
     OR position('user_id' IN select_policy_expression) = 0 THEN
    RAISE EXCEPTION 'Policy di lettura delle proprie partecipazioni mancante o non sicura';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.trip_participants', 'SELECT') THEN
    RAISE EXCEPTION 'Manca SELECT su trip_participants per authenticated';
  END IF;

  IF has_table_privilege('authenticated', 'public.trip_participants', 'INSERT')
     OR has_table_privilege('authenticated', 'public.trip_participants', 'UPDATE') THEN
    RAISE EXCEPTION 'Le partecipazioni non devono essere scrivibili direttamente';
  END IF;

  IF to_regprocedure('public.request_trip_participation(uuid,text)') IS NULL
     OR to_regprocedure('public.cancel_trip_participation(uuid)') IS NULL THEN
    RAISE EXCEPTION 'RPC di richiesta o annullamento partecipazione mancante';
  END IF;

  IF NOT has_function_privilege(
    'authenticated', 'public.request_trip_participation(uuid,text)', 'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated', 'public.cancel_trip_participation(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated non può eseguire le RPC di partecipazione';
  END IF;

  IF has_function_privilege(
    'anon', 'public.request_trip_participation(uuid,text)', 'EXECUTE'
  ) OR has_function_privilege(
    'anon', 'public.cancel_trip_participation(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Anon non deve eseguire le RPC di partecipazione';
  END IF;

  IF NOT (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'public.request_trip_participation(uuid,text)'::regprocedure
  ) OR NOT (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'public.cancel_trip_participation(uuid)'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Le RPC devono applicare i controlli espliciti nel confine privilegiato';
  END IF;
END;
$$;
