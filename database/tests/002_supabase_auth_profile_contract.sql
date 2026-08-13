BEGIN;

DO $$
DECLARE
  exposed_table text;
BEGIN
  FOREACH exposed_table IN ARRAY ARRAY[
    'app_users', 'legal_documents', 'legal_acceptances', 'provinces',
    'municipalities', 'fishing_techniques', 'availability_slots',
    'fisher_profiles', 'user_fishing_techniques', 'user_availability',
    'user_roles', 'fishing_trips', 'trip_private_details',
    'trip_participants', 'trip_feedback', 'app_events', 'notifications',
    'admin_actions'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = exposed_table
        AND relation.relrowsecurity
        AND relation.relforcerowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS/FORCE RLS mancante su public.%', exposed_table;
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS trigger
    JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'auth'
      AND relation.relname = 'users'
      AND trigger.tgname = 'auth_user_created'
      AND NOT trigger.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Trigger auth_user_created mancante';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_users_auth_user_fk'
  ) THEN
    RAISE EXCEPTION 'Collegamento app_users -> auth.users mancante';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'save_fisher_profile'
      AND NOT procedure.prosecdef
  ) THEN
    RAISE EXCEPTION 'RPC save_fisher_profile deve essere SECURITY INVOKER';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'save_fisher_profile'
      AND procedure.prosrc LIKE '%private.recalculate_profile_completion%'
  ) THEN
    RAISE EXCEPTION
      'La RPC save_fisher_profile non deve invocare direttamente lo schema private';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'profile-photos'
      AND NOT public
      AND file_size_limit = 3145728
  ) THEN
    RAISE EXCEPTION 'Bucket privato profile-photos non configurato';
  END IF;
END;
$$;

ROLLBACK;
