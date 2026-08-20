DO $$
DECLARE
  function_oid oid;
  function_definition text;
  function_result text;
BEGIN
  SELECT procedure.oid, pg_get_functiondef(procedure.oid), pg_get_function_result(procedure.oid)
  INTO function_oid, function_definition, function_result
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = 'search_fishing_trips';

  IF function_oid IS NULL THEN
    RAISE EXCEPTION 'RPC search_fishing_trips mancante';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = function_oid AND prosecdef
  ) THEN
    RAISE EXCEPTION 'La RPC discovery deve isolare la lettura tramite SECURITY DEFINER';
  END IF;

  IF position('SET search_path TO ''''' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'search_path della RPC discovery non bloccato';
  END IF;

  IF position('public_meeting_point' IN function_result) > 0
     OR position('gear_notes' IN function_result) > 0 THEN
    RAISE EXCEPTION 'La RPC discovery espone dettagli non necessari';
  END IF;

  IF has_function_privilege('anon', function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'La RPC discovery non deve essere eseguibile da anon';
  END IF;

  IF NOT has_function_privilege('authenticated', function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'La RPC discovery non e eseguibile dagli utenti autenticati';
  END IF;
END;
$$;
