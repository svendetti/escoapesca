BEGIN;

DO $$
DECLARE
  function_definition text;
  function_result text;
BEGIN
  IF to_regprocedure('public.get_public_fishing_trip(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Manca get_public_fishing_trip(uuid)';
  END IF;

  SELECT pg_get_functiondef('public.get_public_fishing_trip(uuid)'::regprocedure)
  INTO function_definition;

  SELECT pg_get_function_result('public.get_public_fishing_trip(uuid)'::regprocedure)
  INTO function_result;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE oid = 'public.get_public_fishing_trip(uuid)'::regprocedure
      AND prosecdef
      AND proconfig @> ARRAY['search_path=""']
  ) THEN
    RAISE EXCEPTION 'La RPC pubblica deve fissare search_path ed essere SECURITY DEFINER';
  END IF;

  IF position('trip_private_details' IN function_definition) > 0
     OR position('organizer_user_id' IN function_result) > 0
     OR position('organizer_name' IN function_result) > 0
     OR position('email' IN function_result) > 0
     OR position('phone' IN function_result) > 0
     OR position('profile_photo' IN function_result) > 0 THEN
    RAISE EXCEPTION 'Il DTO pubblico espone o legge dati non consentiti';
  END IF;

  IF NOT has_function_privilege('anon', 'public.get_public_fishing_trip(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_public_fishing_trip(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'La RPC pubblica deve essere eseguibile da anon e authenticated';
  END IF;

  IF has_table_privilege('anon', 'public.fishing_trips', 'SELECT')
     OR has_table_privilege('anon', 'public.public_fishing_trips', 'SELECT')
     OR has_table_privilege('anon', 'public.trip_private_details', 'SELECT') THEN
    RAISE EXCEPTION 'P0.3 non deve concedere SELECT anonimo a tabelle o view';
  END IF;
END;
$$;

SET LOCAL ROLE anon;
SELECT *
FROM public.get_public_fishing_trip('00000000-0000-0000-0000-000000000000'::uuid);
RESET ROLE;

ROLLBACK;
