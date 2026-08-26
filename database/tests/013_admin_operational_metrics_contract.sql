BEGIN;

DO $$
DECLARE
  required_column text;
  view_definition text;
  view_options text[];
BEGIN
  FOREACH required_column IN ARRAY ARRAY[
    'active_users',
    'disabled_users',
    'new_users_7_days',
    'new_users_30_days',
    'active_trips',
    'open_trips',
    'confirmed_status_trips',
    'completed_trips',
    'cancelled_trips',
    'overdue_trips',
    'open_trips_without_requests',
    'pending_requests',
    'rejected_requests',
    'cancelled_requests',
    'available_places',
    'feedback_received',
    'missing_feedback',
    'average_rating',
    'would_repeat_ratio',
    'profile_completion_ratio',
    'request_acceptance_ratio',
    'confirmed_to_real_trip_ratio',
    'feedback_completion_ratio',
    'average_requests_per_trip'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'beta_metrics'
        AND column_name = required_column
    ) THEN
      RAISE EXCEPTION 'Metrica operativa mancante: %', required_column;
    END IF;
  END LOOP;

  SELECT pg_get_viewdef('public.beta_metrics'::regclass, true)
  INTO view_definition;

  IF position('not app_user.is_test' IN lower(view_definition)) = 0
     OR position('trip.ends_at > now()' IN lower(view_definition)) = 0
     OR position('trip.ends_at <= now()' IN lower(view_definition)) = 0
     OR position('expected_feedback' IN lower(view_definition)) = 0 THEN
    RAISE EXCEPTION 'Definizioni operative o esclusione account test mancanti';
  END IF;

  SELECT reloptions
  INTO view_options
  FROM pg_class
  WHERE oid = 'public.beta_metrics'::regclass;

  IF NOT (view_options @> ARRAY['security_barrier=true'])
     OR NOT (view_options @> ARRAY['security_invoker=true']) THEN
    RAISE EXCEPTION 'beta_metrics deve mantenere security_barrier e security_invoker';
  END IF;

  IF has_table_privilege('anon', 'public.beta_metrics', 'SELECT')
     OR has_table_privilege('authenticated', 'public.beta_metrics', 'SELECT') THEN
    RAISE EXCEPTION 'beta_metrics non deve essere leggibile direttamente dai client';
  END IF;

  IF has_function_privilege('anon', 'public.get_admin_dashboard(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon può eseguire get_admin_dashboard';
  END IF;

  IF position(
    'private.require_current_admin' IN
    pg_get_functiondef('public.get_admin_dashboard(integer)'::regprocedure)
  ) = 0 THEN
    RAISE EXCEPTION 'get_admin_dashboard non verifica il ruolo Admin';
  END IF;

  PERFORM * FROM public.beta_metrics;
END;
$$;

ROLLBACK;
