BEGIN;

DO $$
DECLARE
  function_definition text;
BEGIN
  IF to_regprocedure('public.get_admin_dashboard(integer)') IS NULL THEN
    RAISE EXCEPTION 'get_admin_dashboard(integer) missing';
  END IF;

  IF to_regprocedure('public.admin_set_user_status(uuid,text,text)') IS NULL THEN
    RAISE EXCEPTION 'admin_set_user_status(uuid,text,text) missing';
  END IF;

  IF to_regprocedure('public.admin_cancel_fishing_trip(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'admin_cancel_fishing_trip(uuid,text) missing';
  END IF;

  IF to_regprocedure('private.require_current_admin()') IS NULL THEN
    RAISE EXCEPTION 'private.require_current_admin() missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'user_roles_select_own'
      AND roles = ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'user_roles_select_own policy missing';
  END IF;

  IF has_function_privilege('anon', 'public.get_admin_dashboard(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute get_admin_dashboard';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.get_admin_dashboard(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute get_admin_dashboard';
  END IF;

  IF has_function_privilege('anon', 'public.admin_set_user_status(uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute admin_set_user_status';
  END IF;

  IF has_function_privilege('anon', 'public.admin_cancel_fishing_trip(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute admin_cancel_fishing_trip';
  END IF;

  SELECT pg_get_functiondef('public.get_admin_dashboard(integer)'::regprocedure)
  INTO function_definition;
  IF position('private.require_current_admin' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'dashboard does not enforce admin access';
  END IF;

  SELECT pg_get_functiondef('public.admin_set_user_status(uuid,text,text)'::regprocedure)
  INTO function_definition;
  IF position('admin_actions' IN function_definition) = 0
     OR position('p_user_id = admin_user_id' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'user moderation audit or self-protection missing';
  END IF;

  SELECT pg_get_functiondef('public.admin_cancel_fishing_trip(uuid,text)'::regprocedure)
  INTO function_definition;
  IF position('admin_actions' IN function_definition) = 0
     OR position('app_events' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'trip moderation audit or notification event missing';
  END IF;
END;
$$;

ROLLBACK;
