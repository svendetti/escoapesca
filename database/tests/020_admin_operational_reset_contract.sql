BEGIN;

DO $$
DECLARE
  function_definition text;
  deleted_table text;
  preserved_table text;
BEGIN
  IF to_regprocedure('public.admin_reset_operational_data(text)') IS NULL THEN
    RAISE EXCEPTION 'admin_reset_operational_data(text) mancante';
  END IF;

  IF has_function_privilege(
    'anon', 'public.admin_reset_operational_data(text)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon può eseguire il reset operativo';
  END IF;

  IF NOT has_function_privilege(
    'authenticated', 'public.admin_reset_operational_data(text)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated non può raggiungere la RPC protetta';
  END IF;

  SELECT lower(pg_get_functiondef(
    'public.admin_reset_operational_data(text)'::regprocedure
  ))
  INTO function_definition;

  IF function_definition NOT LIKE '%private.require_current_admin%'
    OR function_definition NOT LIKE '%elimina uscite%'
    OR function_definition NOT LIKE '%access exclusive%'
  THEN
    RAISE EXCEPTION 'Controlli admin, conferma o atomicità del reset mancanti';
  END IF;

  FOREACH deleted_table IN ARRAY ARRAY[
    'admin_actions',
    'notifications',
    'email_outbox',
    'app_events',
    'trip_feedback',
    'trip_private_details',
    'trip_participants',
    'fishing_trips'
  ]
  LOOP
    IF function_definition NOT LIKE
      format('%%delete from public.%s%%', deleted_table)
    THEN
      RAISE EXCEPTION 'Tabella operativa non azzerata: %', deleted_table;
    END IF;
  END LOOP;

  FOREACH preserved_table IN ARRAY ARRAY[
    'app_users',
    'fisher_profiles',
    'legal_acceptances',
    'user_fishing_techniques',
    'user_availability',
    'user_roles'
  ]
  LOOP
    IF function_definition LIKE
      format('%%delete from public.%s%%', preserved_table)
    THEN
      RAISE EXCEPTION 'Tabella utente non preservata: %', preserved_table;
    END IF;
  END LOOP;
END;
$$;

ROLLBACK;
