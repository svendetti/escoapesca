DO $$
DECLARE
  discovery_oid oid;
  discovery_definition text;
  process_oid oid;
BEGIN
  SELECT procedure.oid, pg_get_functiondef(procedure.oid)
  INTO discovery_oid, discovery_definition
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = 'search_fishing_trips'
    AND pg_get_function_identity_arguments(procedure.oid) =
      'p_province_code text, p_zone text, p_technique_id smallint, p_water_type text, p_starts_from timestamp with time zone, p_starts_before timestamp with time zone, p_limit integer';

  IF discovery_oid IS NULL
     OR position('strpos(lower(trip.public_zone), normalized_zone)' IN discovery_definition) = 0 THEN
    RAISE EXCEPTION 'Filtro zona della discovery mancante o non letterale';
  END IF;

  IF has_function_privilege('anon', discovery_oid, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', discovery_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Privilegi della discovery non corretti';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.notifications', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.notifications', 'read_at', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.notifications', 'notification_type', 'UPDATE') THEN
    RAISE EXCEPTION 'Privilegi minimi delle notifiche non corretti';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_select_own'
      AND qual LIKE '%auth.uid()%'
      AND qual NOT LIKE '%current_user_is_admin%'
  ) THEN
    RAISE EXCEPTION 'Policy notifiche utente assente o dipendente dai privilegi Admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.app_events'::regclass
      AND tgname = 'app_events_create_notifications'
      AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.fishing_trips'::regclass
      AND tgname = 'fishing_trips_log_notification_event'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Trigger notifiche incompleti';
  END IF;

  SELECT procedure.oid
  INTO process_oid
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.proname = 'process_app_event'
    AND procedure.prosecdef;

  IF process_oid IS NULL
     OR has_function_privilege('authenticated', process_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Processore notifiche assente o esposto';
  END IF;
END;
$$;
