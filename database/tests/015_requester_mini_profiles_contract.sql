BEGIN;

DO $$
DECLARE
  function_result text;
  storage_policy text;
BEGIN
  IF to_regprocedure('public.list_trip_participation_requests(uuid)') IS NULL THEN
    RAISE EXCEPTION 'list_trip_participation_requests(uuid) is missing';
  END IF;

  SELECT pg_get_function_result(to_regprocedure('public.list_trip_participation_requests(uuid)'))
  INTO function_result;

  IF function_result NOT ILIKE '%age_band%'
    OR function_result NOT ILIKE '%technique_names%'
    OR function_result NOT ILIKE '%profile_photo_key%'
    OR function_result NOT ILIKE '%bio%'
  THEN
    RAISE EXCEPTION 'requester mini-profile fields are incomplete: %', function_result;
  END IF;

  IF function_result ILIKE '%email%'
    OR function_result ILIKE '%phone%'
    OR function_result ILIKE '%travel_radius%'
  THEN
    RAISE EXCEPTION 'requester mini-profile exposes a forbidden field: %', function_result;
  END IF;

  IF has_function_privilege('anon', 'public.list_trip_participation_requests(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute list_trip_participation_requests';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.list_trip_participation_requests(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must execute list_trip_participation_requests';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_participants'
      AND policyname = 'trip_participants_select_own_or_organizer'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'combined participant/organizer SELECT policy is missing';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trip_participants'
      AND cmd = 'SELECT'
      AND 'authenticated' = ANY(roles)
  ) <> 1 THEN
    RAISE EXCEPTION 'trip_participants must have one authenticated SELECT policy';
  END IF;

  SELECT qual
  INTO storage_policy
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'profile_photos_select_request_organizer'
    AND cmd = 'SELECT';

  IF storage_policy IS NULL
    OR storage_policy NOT ILIKE '%profile-photos%'
    OR storage_policy NOT ILIKE '%requested%'
    OR storage_policy NOT ILIKE '%organizer_user_id%'
  THEN
    RAISE EXCEPTION 'request organizer photo policy is missing or incomplete: %', storage_policy;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'profile-photos'
      AND public
  ) THEN
    RAISE EXCEPTION 'profile-photos bucket must remain private';
  END IF;
END;
$$;

ROLLBACK;
