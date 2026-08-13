BEGIN;

DO $$
DECLARE
  policy_check text;
BEGIN
  SELECT with_check INTO policy_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'fishing_trips'
    AND policyname = 'fishing_trips_insert_own_completed_profile'
    AND cmd = 'INSERT'
    AND roles = ARRAY['authenticated']::name[];

  IF policy_check IS NULL THEN
    RAISE EXCEPTION 'Manca la policy di creazione uscita per utenti autenticati';
  END IF;

  IF position('auth.uid()' IN policy_check) = 0
     OR position('completed_at IS NOT NULL' IN policy_check) = 0
     OR position('status = ''open''' IN policy_check) = 0 THEN
    RAISE EXCEPTION 'La policy di creazione uscita non applica tutti i vincoli attesi';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.fishing_trips', 'title', 'INSERT')
     OR NOT has_column_privilege('authenticated', 'public.fishing_trips', 'organizer_user_id', 'INSERT') THEN
    RAISE EXCEPTION 'Mancano i privilegi minimi di inserimento su fishing_trips';
  END IF;

  IF has_column_privilege('authenticated', 'public.fishing_trips', 'created_at', 'INSERT')
     OR has_column_privilege('authenticated', 'public.fishing_trips', 'confirmed_at', 'INSERT') THEN
    RAISE EXCEPTION 'L''utente non deve poter impostare colonne gestite dal sistema';
  END IF;
END;
$$;

ROLLBACK;
