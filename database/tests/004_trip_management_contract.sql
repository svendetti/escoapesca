BEGIN;

DO $$
DECLARE
  select_expression text;
  update_expression text;
  update_check_expression text;
BEGIN
  SELECT qual
  INTO select_expression
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'fishing_trips'
    AND policyname = 'fishing_trips_select_authorized'
    AND cmd = 'SELECT'
    AND roles = ARRAY['authenticated']::name[];

  IF select_expression IS NULL
     OR position('auth.uid()' IN select_expression) = 0
     OR position('organizer_user_id' IN select_expression) = 0
     OR position('participant' IN select_expression) = 0
     OR position('active' IN select_expression) = 0 THEN
    RAISE EXCEPTION 'La lettura delle uscite autorizzate non è protetta come previsto';
  END IF;

  SELECT qual, with_check
  INTO update_expression, update_check_expression
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'fishing_trips'
    AND policyname = 'fishing_trips_update_own_future_open'
    AND cmd = 'UPDATE'
    AND roles = ARRAY['authenticated']::name[];

  IF update_expression IS NULL
     OR update_check_expression IS NULL
     OR position('auth.uid()' IN update_expression) = 0
     OR position('status = ''open''' IN update_expression) = 0
     OR position('starts_at > now()' IN update_expression) = 0
     OR position('cancelled' IN update_check_expression) = 0 THEN
    RAISE EXCEPTION 'La modifica delle uscite non applica tutti i vincoli attesi';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.fishing_trips', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.fishing_trips', 'title', 'UPDATE')
     OR NOT has_column_privilege('authenticated', 'public.fishing_trips', 'status', 'UPDATE') THEN
    RAISE EXCEPTION 'Mancano i privilegi minimi per gestire le proprie uscite';
  END IF;

  IF has_column_privilege('authenticated', 'public.fishing_trips', 'organizer_user_id', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.fishing_trips', 'confirmed_at', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.fishing_trips', 'completed_at', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.fishing_trips', 'created_at', 'UPDATE') THEN
    RAISE EXCEPTION 'L''utente può modificare colonne gestite dal sistema';
  END IF;

  IF has_table_privilege('authenticated', 'public.fishing_trips', 'DELETE') THEN
    RAISE EXCEPTION 'La Beta non deve consentire eliminazioni fisiche delle uscite';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fishing_trips_cancellation_details_consistency'
      AND conrelid = 'public.fishing_trips'::regclass
  ) THEN
    RAISE EXCEPTION 'Manca il vincolo di consistenza dell''annullamento';
  END IF;
END;
$$;

ROLLBACK;
