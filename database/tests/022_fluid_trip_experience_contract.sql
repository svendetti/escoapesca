BEGIN;

DO $$
DECLARE
  public_result text;
  group_definition text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fishing_trips'
      AND column_name = 'public_code' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'public_code obbligatorio assente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fishing_trips'
      AND column_name = 'title_is_custom' AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fishing_trips'
      AND column_name = 'end_precision' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'Metadati dell’esperienza fluida assenti';
  END IF;

  IF to_regprocedure('public.get_trip_organizer_summary(uuid)') IS NULL
     OR to_regprocedure('public.list_trip_group_members(uuid)') IS NULL THEN
    RAISE EXCEPTION 'RPC organizzatore o gruppo assente';
  END IF;

  IF has_function_privilege('anon', 'public.get_trip_organizer_summary(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.list_trip_group_members(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_trip_organizer_summary(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.list_trip_group_members(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Privilegi RPC organizzatore/gruppo non corretti';
  END IF;

  SELECT pg_get_function_result('public.get_public_fishing_trip(uuid)'::regprocedure)
  INTO public_result;
  IF position('organizer_user_id' IN public_result) > 0
     OR position('organizer_name' IN public_result) > 0
     OR position('profile_photo' IN public_result) > 0 THEN
    RAISE EXCEPTION 'La pagina pubblica espone l’identità dell’organizzatore';
  END IF;

  SELECT lower(pg_get_functiondef('public.list_trip_group_members(uuid)'::regprocedure))
  INTO group_definition;
  IF position('auth.uid()' IN group_definition) = 0
     OR position('accepted' IN group_definition) = 0
     OR position('confirmed' IN group_definition) = 0
     OR position('completed' IN group_definition) = 0 THEN
    RAISE EXCEPTION 'La RPC del gruppo non è vincolata agli utenti autorizzati';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'profile_photos_select_visible_trip_organizer'
      AND roles @> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'Policy foto organizzatore assente';
  END IF;
END;
$$;

SET LOCAL ROLE anon;
SELECT * FROM public.get_public_fishing_trip('00000000-0000-0000-0000-000000000000'::uuid);
RESET ROLE;

ROLLBACK;
