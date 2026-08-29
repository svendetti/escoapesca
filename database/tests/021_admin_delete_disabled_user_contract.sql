BEGIN;

DO $$
DECLARE
  function_definition text;
  target_constraint text;
BEGIN
  IF to_regprocedure(
    'public.admin_delete_disabled_user(uuid,uuid,text,text)'
  ) IS NULL THEN
    RAISE EXCEPTION 'admin_delete_disabled_user mancante';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.admin_delete_disabled_user(uuid,uuid,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.admin_delete_disabled_user(uuid,uuid,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'La funzione di eliminazione è accessibile ai ruoli client';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'public.admin_delete_disabled_user(uuid,uuid,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role non può eseguire la funzione di eliminazione';
  END IF;

  SELECT pg_get_functiondef(
    'public.admin_delete_disabled_user(uuid,uuid,text,text)'::regprocedure
  )
  INTO function_definition;

  IF function_definition NOT ILIKE '%actor.status = ''active''%'
    OR function_definition NOT ILIKE '%actor_role.role = ''admin''%'
    OR function_definition NOT ILIKE '%target_status <> ''disabled''%'
    OR function_definition NOT ILIKE '%p_actor_user_id = p_user_id%'
    OR function_definition NOT ILIKE '%target_role.role = ''admin''%'
    OR function_definition NOT ILIKE '%DELETE FROM auth.users%'
    OR function_definition NOT ILIKE '%DELETE FROM public.fishing_trips%'
    OR function_definition NOT ILIKE '%user_deleted%'
  THEN
    RAISE EXCEPTION 'Controlli o pulizia della funzione di eliminazione incompleti';
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO target_constraint
  FROM pg_constraint
  WHERE conname = 'admin_actions_target_check'
    AND conrelid = 'public.admin_actions'::regclass;

  IF target_constraint NOT ILIKE '%user_deleted%'
    OR target_constraint NOT ILIKE '%trip_moderated_cancelled%'
  THEN
    RAISE EXCEPTION 'Il registro non preserva le azioni dopo la rimozione del target';
  END IF;
END;
$$;

ROLLBACK;
