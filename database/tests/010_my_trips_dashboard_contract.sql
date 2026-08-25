DO $$
DECLARE
  dashboard_oid oid;
  dashboard_definition text;
BEGIN
  SELECT procedure.oid, lower(pg_get_functiondef(procedure.oid))
  INTO dashboard_oid, dashboard_definition
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = 'list_my_trip_participations'
    AND pg_get_function_identity_arguments(procedure.oid) = '';

  IF dashboard_oid IS NULL THEN
    RAISE EXCEPTION 'RPC dashboard partecipazioni assente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    WHERE procedure.oid = dashboard_oid
      AND procedure.prosecdef
      AND procedure.provolatile = 's'
      AND procedure.proconfig @> ARRAY['search_path=""']::text[]
  ) THEN
    RAISE EXCEPTION 'RPC dashboard non protetta con SECURITY DEFINER, STABLE e search_path vuoto';
  END IF;

  IF has_function_privilege('anon', dashboard_oid, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', dashboard_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Privilegi RPC dashboard non corretti';
  END IF;

  IF position('auth.uid()' IN dashboard_definition) = 0
     OR position('participant.user_id = authenticated_user_id' IN dashboard_definition) = 0 THEN
    RAISE EXCEPTION 'RPC dashboard non vincolata all’utente autenticato';
  END IF;

  IF position('trip_private_details' IN dashboard_definition) > 0
     OR position('public_meeting_point' IN dashboard_definition) > 0
     OR position('exact_lat' IN dashboard_definition) > 0
     OR position('exact_lon' IN dashboard_definition) > 0
     OR position('private_notes' IN dashboard_definition) > 0 THEN
    RAISE EXCEPTION 'RPC dashboard espone o consulta dettagli protetti';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'trip_participants'
      AND indexdef LIKE '%(user_id, status, requested_at DESC)%'
  ) THEN
    RAISE EXCEPTION 'Indice dashboard partecipazioni assente';
  END IF;
END;
$$;
