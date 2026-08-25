DO $$
DECLARE
  participant_policy text;
  private_policy text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trip_private_details'
      AND column_name = 'meeting_point_text'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Il punto di incontro privato deve essere obbligatorio';
  END IF;

  IF NOT has_table_privilege(
    'authenticated', 'public.trip_private_details', 'SELECT'
  ) OR NOT has_column_privilege(
    'authenticated', 'public.trip_private_details', 'meeting_point_text', 'INSERT'
  ) OR NOT has_column_privilege(
    'authenticated', 'public.trip_private_details', 'private_notes', 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'Privilegi minimi dei dettagli privati incompleti';
  END IF;

  IF has_table_privilege('anon', 'public.trip_private_details', 'SELECT')
     OR has_table_privilege('authenticated', 'public.trip_private_details', 'DELETE') THEN
    RAISE EXCEPTION 'Anon o cancellazione diretta non devono essere abilitati';
  END IF;

  SELECT qual
  INTO participant_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'fishing_trips'
    AND policyname = 'fishing_trips_select_authorized';

  IF participant_policy IS NULL
     OR position('confirmed' IN participant_policy) = 0
     OR position('auth.uid()' IN participant_policy) = 0 THEN
    RAISE EXCEPTION 'Accesso al viaggio del partecipante non correttamente vincolato';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fishing_trips'
      AND policyname IN (
        'fishing_trips_select_own',
        'fishing_trips_select_confirmed_participant'
      )
  ) THEN
    RAISE EXCEPTION 'Policy SELECT duplicate sulle uscite non consolidate';
  END IF;

  SELECT qual
  INTO private_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'trip_private_details'
    AND policyname = 'trip_private_details_select_authorized';

  IF private_policy IS NULL
     OR position('confirmed' IN private_policy) = 0
     OR position('auth.uid()' IN private_policy) = 0 THEN
    RAISE EXCEPTION 'Policy di lettura privata priva del vincolo di conferma';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.trip_private_details'::regclass
      AND tgname = 'trip_private_details_log_change'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Evento applicativo dei dettagli privati non configurato';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE pg_namespace.nspname = 'private'
      AND pg_proc.proname = 'log_trip_private_details_changed'
      AND pg_proc.prosecdef
  ) THEN
    RAISE EXCEPTION 'Trigger privilegiato dei dettagli privati mancante';
  END IF;
END;
$$;
