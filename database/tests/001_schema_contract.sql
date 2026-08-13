BEGIN;

DO $test$
DECLARE
  missing_tables text[];
  public_view_definition text;
  private_policy_expression text;
BEGIN
  SELECT array_agg(expected.table_name ORDER BY expected.table_name)
  INTO missing_tables
  FROM (
    VALUES
      ('app_users'),
      ('legal_documents'),
      ('legal_acceptances'),
      ('provinces'),
      ('municipalities'),
      ('fishing_techniques'),
      ('availability_slots'),
      ('fisher_profiles'),
      ('user_fishing_techniques'),
      ('user_availability'),
      ('user_roles'),
      ('fishing_trips'),
      ('trip_private_details'),
      ('trip_participants'),
      ('trip_feedback'),
      ('app_events'),
      ('notifications'),
      ('admin_actions')
  ) AS expected(table_name)
  WHERE to_regclass('public.' || expected.table_name) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelle mancanti: %', missing_tables;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_users'
      AND column_name ILIKE '%password%'
  ) THEN
    RAISE EXCEPTION 'Le credenziali non devono essere memorizzate in app_users';
  END IF;

  IF to_regclass('public.public_fishing_trips') IS NULL
     OR to_regclass('public.beta_real_fishing_trips') IS NULL
     OR to_regclass('public.beta_metrics') IS NULL THEN
    RAISE EXCEPTION 'Viste pubbliche o metriche mancanti';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beta_metrics'
      AND column_name = 'reported_trips'
  ) THEN
    RAISE EXCEPTION 'La metrica delle uscite dichiarate è mancante';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_fishing_trips'
      AND column_name IN ('exact_lat', 'exact_lon', 'meeting_point_text', 'private_notes')
  ) THEN
    RAISE EXCEPTION 'La vista pubblica espone dettagli privati dello spot';
  END IF;

  SELECT pg_get_viewdef('public.public_fishing_trips'::regclass, true)
  INTO public_view_definition;

  IF position('trip_private_details' IN public_view_definition) > 0 THEN
    RAISE EXCEPTION 'La vista pubblica non deve leggere trip_private_details';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'public.trip_private_details'::regclass
      AND relrowsecurity
      AND relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS e FORCE RLS devono essere attivi sui dettagli privati';
  END IF;

  SELECT qual
  INTO private_policy_expression
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'trip_private_details'
    AND policyname = 'trip_private_details_select_authorized';

  IF private_policy_expression IS NULL
     OR position('confirmed' IN lower(private_policy_expression)) = 0
     OR position('participant' IN lower(private_policy_expression)) = 0 THEN
    RAISE EXCEPTION 'Policy di lettura dello spot incompleta';
  END IF;

  IF (SELECT count(*) FROM provinces WHERE region_code = 'LAZ' AND active) <> 5 THEN
    RAISE EXCEPTION 'Il seed deve contenere le cinque province del Lazio';
  END IF;

  IF (SELECT count(*) FROM fishing_techniques WHERE active) <> 13 THEN
    RAISE EXCEPTION 'Il seed Beta deve contenere tredici tecniche attive';
  END IF;

  IF (SELECT count(*) FROM availability_slots WHERE active) <> 5 THEN
    RAISE EXCEPTION 'Il seed Beta deve contenere cinque disponibilità attive';
  END IF;

  IF current_app_user_id() IS NOT NULL THEN
    RAISE EXCEPTION 'Senza sessione applicativa current_app_user_id deve essere NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_events_no_private_spot_payload'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_no_private_spot_payload'
  ) THEN
    RAISE EXCEPTION 'Eventi e notifiche devono rifiutare dettagli privati dello spot';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'fisher_profiles_municipality_province_check'
      AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'fishing_trips_municipality_province_check'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Manca la coerenza comune/provincia';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trip_participants_not_organizer'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'L''organizzatore deve essere escluso dai partecipanti';
  END IF;

  IF to_regclass('public.notifications_user_idx') IS NULL
     OR to_regclass('public.trip_feedback_author_idx') IS NULL
     OR to_regclass('public.app_events_trip_idx') IS NULL
     OR to_regclass('public.fishing_trips_discovery_idx') IS NULL THEN
    RAISE EXCEPTION 'Mancano indici essenziali per foreign key, RLS o ricerca';
  END IF;

  IF has_schema_privilege('public', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Il ruolo PUBLIC non deve poter creare oggetti nello schema public';
  END IF;
END;
$test$;

ROLLBACK;
