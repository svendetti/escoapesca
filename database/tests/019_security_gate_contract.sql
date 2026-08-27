BEGIN;

DO $$
DECLARE
  secured_function record;
  client_function_count integer;
  function_definition text;
  function_result text;
BEGIN
  SELECT count(*)
  INTO client_function_count
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE procedure.prosecdef
    AND namespace.nspname IN ('public', 'private')
    AND (
      has_function_privilege('anon', procedure.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    );

  IF client_function_count <> 14 THEN
    RAISE EXCEPTION
      'Inventario SECURITY DEFINER client-facing inatteso: % funzioni',
      client_function_count;
  END IF;

  FOR secured_function IN
    SELECT procedure.oid, namespace.nspname, procedure.proname,
      procedure.proconfig, procedure.prosrc
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE procedure.prosecdef
      AND namespace.nspname IN ('public', 'private')
      AND (
        has_function_privilege('anon', procedure.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      )
  LOOP
    IF NOT (
      secured_function.proconfig @> ARRAY['search_path=""']
    ) THEN
      RAISE EXCEPTION
        'search_path non vuoto su %.%',
        secured_function.nspname,
        secured_function.proname;
    END IF;

    IF secured_function.prosrc ~* '\mexecute\M|format\s*\(' THEN
      RAISE EXCEPTION
        'SQL dinamico non autorizzato su %.%',
        secured_function.nspname,
        secured_function.proname;
    END IF;
  END LOOP;

  IF has_schema_privilege('anon', 'private', 'USAGE')
    OR has_schema_privilege('authenticated', 'private', 'USAGE')
    OR has_function_privilege(
      'anon', 'private.is_active_trip_organizer(uuid)', 'EXECUTE'
    )
    OR NOT has_function_privilege(
      'authenticated', 'private.is_active_trip_organizer(uuid)', 'EXECUTE'
    )
  THEN
    RAISE EXCEPTION 'Confine dello schema private non coerente';
  END IF;

  IF has_function_privilege(
    'anon', 'public.get_admin_dashboard(integer)', 'EXECUTE'
  ) OR has_function_privilege(
    'anon', 'public.admin_set_user_status(uuid,text,text)', 'EXECUTE'
  ) OR has_function_privilege(
    'anon', 'public.admin_cancel_fishing_trip(uuid,text)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Una RPC admin è eseguibile da anon';
  END IF;

  SELECT pg_get_functiondef(
    'public.get_admin_dashboard(integer)'::regprocedure
  )
  INTO function_definition;
  IF function_definition NOT ILIKE '%private.require_current_admin%' THEN
    RAISE EXCEPTION 'get_admin_dashboard non verifica il ruolo admin';
  END IF;

  SELECT pg_get_functiondef(
    'public.admin_set_user_status(uuid,text,text)'::regprocedure
  )
  INTO function_definition;
  IF function_definition NOT ILIKE '%private.require_current_admin%' THEN
    RAISE EXCEPTION 'admin_set_user_status non verifica il ruolo admin';
  END IF;

  SELECT pg_get_functiondef(
    'public.admin_cancel_fishing_trip(uuid,text)'::regprocedure
  )
  INTO function_definition;
  IF function_definition NOT ILIKE '%private.require_current_admin%' THEN
    RAISE EXCEPTION 'admin_cancel_fishing_trip non verifica il ruolo admin';
  END IF;

  SELECT pg_get_functiondef(
    'public.get_public_fishing_trip(uuid)'::regprocedure
  )
  INTO function_definition;
  SELECT pg_get_function_result(
    'public.get_public_fishing_trip(uuid)'::regprocedure
  )
  INTO function_result;

  IF function_definition ILIKE '%trip_private_details%'
    OR function_result ILIKE '%organizer_user_id%'
    OR function_result ILIKE '%email%'
    OR function_result ILIKE '%phone%'
    OR function_result ILIKE '%participant_id%'
    OR function_result ILIKE '%participant_user_id%'
    OR function_result ILIKE '%participants json%'
    OR function_result ILIKE '%profile_photo%'
    OR function_result ILIKE '%admin%'
  THEN
    RAISE EXCEPTION 'DTO pubblico oltre il perimetro consentito';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'profile-photos'
      AND public
  ) THEN
    RAISE EXCEPTION 'Il bucket profile-photos deve restare privato';
  END IF;

  IF has_table_privilege('anon', 'public.email_outbox', 'SELECT')
    OR has_table_privilege('authenticated', 'public.email_outbox', 'SELECT')
    OR has_table_privilege('authenticated', 'public.email_outbox', 'INSERT')
    OR EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'email_outbox'
        AND column_name IN ('email', 'recipient_email')
    )
    OR has_function_privilege(
      'authenticated', 'public.claim_email_deliveries(integer)', 'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.complete_email_delivery(uuid,boolean,text,text)',
      'EXECUTE'
    )
  THEN
    RAISE EXCEPTION 'Delivery email esposto a ruoli client';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename = 'admin_actions'
          AND policyname = 'admin_actions_client_deny_all')
        OR (tablename = 'app_events'
          AND policyname = 'app_events_client_deny_all')
        OR (tablename = 'email_outbox'
          AND policyname = 'email_outbox_client_deny_all')
      )
      AND permissive = 'RESTRICTIVE'
      AND qual = 'false'
      AND with_check = 'false'
  ) <> 3 THEN
    RAISE EXCEPTION 'Policy deny-all interne incomplete';
  END IF;
END;
$$;

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000001101',
    'authenticated', 'authenticated', 'p011-organizer-a@example.invalid',
    '', now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"P011 Organizer A","adult_confirmed":true,"privacy_accepted":true,"terms_accepted":true,"province_code":"RM","municipality_name":"Roma","age_band":"25_34"}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000001102',
    'authenticated', 'authenticated', 'p011-organizer-b@example.invalid',
    '', now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"P011 Organizer B","adult_confirmed":true,"privacy_accepted":true,"terms_accepted":true,"province_code":"RM","municipality_name":"Roma","age_band":"25_34"}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000001103',
    'authenticated', 'authenticated', 'p011-requester@example.invalid',
    '', now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"P011 Requester","adult_confirmed":true,"privacy_accepted":true,"terms_accepted":true,"province_code":"RM","municipality_name":"Roma","age_band":"25_34"}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000001104',
    'authenticated', 'authenticated', 'p011-outsider@example.invalid',
    '', now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"P011 Outsider","adult_confirmed":true,"privacy_accepted":true,"terms_accepted":true,"province_code":"RM","municipality_name":"Roma","age_band":"25_34"}'::jsonb,
    now(), now()
  );

UPDATE public.app_users
SET is_test = true,
    status = 'active'
WHERE id IN (
  '00000000-0000-4000-8000-000000001101',
  '00000000-0000-4000-8000-000000001102',
  '00000000-0000-4000-8000-000000001103',
  '00000000-0000-4000-8000-000000001104'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001101',
  true
);

INSERT INTO public.fishing_trips (
  id, organizer_user_id, title, technique_id, water_type, starts_at, ends_at,
  province_code, public_zone, public_meeting_point, max_participants,
  recommended_level, description, trip_type, status
)
SELECT
  '00000000-0000-4000-8000-000000001201',
  '00000000-0000-4000-8000-000000001101',
  'P0.11 uscita privata', technique.id, 'freshwater',
  now() + interval '7 days', now() + interval '7 days 4 hours',
  province.code, 'Zona pubblica P0.11', 'Pontile pubblico', 3, 'any',
  'Fixture transazionale per il security gate.', 'free', 'open'
FROM public.fishing_techniques AS technique
CROSS JOIN public.provinces AS province
WHERE technique.active
  AND province.active
ORDER BY technique.id, province.code
LIMIT 1;

INSERT INTO public.fishing_trips (
  id, organizer_user_id, title, technique_id, water_type, starts_at, ends_at,
  province_code, public_zone, public_meeting_point, max_participants,
  recommended_level, description, trip_type, status
)
SELECT
  '00000000-0000-4000-8000-000000001202',
  '00000000-0000-4000-8000-000000001102',
  'P0.11 uscita altro organizzatore', technique.id, 'freshwater',
  now() + interval '8 days', now() + interval '8 days 4 hours',
  province.code, 'Altra zona pubblica P0.11', 'Altro pontile pubblico', 3,
  'any', 'Fixture transazionale per il controllo cross-user.', 'free', 'open'
FROM public.fishing_techniques AS technique
CROSS JOIN public.provinces AS province
WHERE technique.active
  AND province.active
ORDER BY technique.id, province.code
LIMIT 1;

INSERT INTO public.trip_private_details (
  trip_id, meeting_point_text, exact_lat, exact_lon, private_notes
)
VALUES (
  '00000000-0000-4000-8000-000000001201',
  'Punto privato P0.11', 41.9000, 12.5000, 'Nota privata P0.11'
);

INSERT INTO public.trip_participants (
  id, trip_id, user_id, status, request_message
)
VALUES (
  '00000000-0000-4000-8000-000000001301',
  '00000000-0000-4000-8000-000000001201',
  '00000000-0000-4000-8000-000000001103',
  'requested',
  'Richiesta P0.11'
);

INSERT INTO storage.objects (
  id, bucket_id, name, owner, owner_id, metadata
)
VALUES (
  '00000000-0000-4000-8000-000000001401',
  'profile-photos',
  '00000000-0000-4000-8000-000000001103/avatar.webp',
  '00000000-0000-4000-8000-000000001103',
  '00000000-0000-4000-8000-000000001103',
  '{"mimetype":"image/webp","size":128}'::jsonb
);

SET LOCAL ROLE anon;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  BEGIN
    PERFORM 1 FROM public.trip_private_details
    WHERE trip_id = '00000000-0000-4000-8000-000000001201';
    RAISE EXCEPTION 'anon ha letto trip_private_details';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT count(*) INTO visible_rows
  FROM public.get_public_fishing_trip(
    '00000000-0000-4000-8000-000000001201'
  );
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'anon non legge il DTO pubblico previsto';
  END IF;

  SELECT count(*) INTO visible_rows
  FROM public.get_public_fishing_trip(
    '00000000-0000-4000-8000-000000009999'
  );
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'Enumeration pubblica inattesa';
  END IF;

  BEGIN
    PERFORM 1 FROM public.list_trip_participation_requests(
      '00000000-0000-4000-8000-000000001201'
    );
    RAISE EXCEPTION 'anon ha eseguito la RPC mini-profilo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT count(*) INTO visible_rows
  FROM storage.objects
  WHERE bucket_id = 'profile-photos';
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'anon elenca foto profilo private';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001104',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows
  FROM public.trip_private_details
  WHERE trip_id = '00000000-0000-4000-8000-000000001201';
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'Non partecipante vede lo spot privato';
  END IF;

  BEGIN
    PERFORM public.get_admin_dashboard(1);
    RAISE EXCEPTION 'Non-admin ha eseguito get_admin_dashboard';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM 1 FROM public.admin_set_user_status(
      '00000000-0000-4000-8000-000000001103',
      'disabled',
      'Test negativo P0.11'
    );
    RAISE EXCEPTION 'Non-admin ha eseguito admin_set_user_status';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM 1 FROM public.admin_cancel_fishing_trip(
      '00000000-0000-4000-8000-000000001201',
      'Test negativo P0.11'
    );
    RAISE EXCEPTION 'Non-admin ha eseguito admin_cancel_fishing_trip';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM 1 FROM public.list_trip_participation_requests(
      '00000000-0000-4000-8000-000000001201'
    );
    RAISE EXCEPTION 'Altro utente vede il mini-profilo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT count(*) INTO visible_rows
  FROM storage.objects
  WHERE bucket_id = 'profile-photos';
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'Altro utente elenca foto profilo';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001103',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows
  FROM public.trip_private_details
  WHERE trip_id = '00000000-0000-4000-8000-000000001201';
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'Richiesta requested vede lo spot privato';
  END IF;

  SELECT count(*) INTO visible_rows
  FROM storage.objects
  WHERE bucket_id = 'profile-photos';
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'Utente non vede esclusivamente la propria foto';
  END IF;
END;
$$;

RESET ROLE;
UPDATE public.trip_participants
SET status = 'accepted',
    accepted_at = now()
WHERE id = '00000000-0000-4000-8000-000000001301';

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001103',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows
  FROM public.trip_private_details
  WHERE trip_id = '00000000-0000-4000-8000-000000001201';
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION
      'Richiesta accepted vede lo spot prima della conferma uscita';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001101',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows
  FROM public.trip_private_details
  WHERE trip_id = '00000000-0000-4000-8000-000000001201';
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'Organizzatore non vede lo spot privato';
  END IF;

  SELECT count(*) INTO visible_rows
  FROM public.list_trip_participation_requests(
    '00000000-0000-4000-8000-000000001201'
  );
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'Organizzatore non vede il mini-profilo richiesto';
  END IF;

  SELECT count(*) INTO visible_rows
  FROM storage.objects
  WHERE bucket_id = 'profile-photos';
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION
      'Organizzatore non vede esclusivamente la foto del richiedente';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001102',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  BEGIN
    PERFORM 1 FROM public.list_trip_participation_requests(
      '00000000-0000-4000-8000-000000001201'
    );
    RAISE EXCEPTION 'Altro organizzatore vede il mini-profilo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT count(*) INTO visible_rows
  FROM storage.objects
  WHERE bucket_id = 'profile-photos';
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'Altro organizzatore vede foto non autorizzate';
  END IF;
END;
$$;

RESET ROLE;
UPDATE public.trip_participants
SET status = 'confirmed',
    confirmed_at = now()
WHERE id = '00000000-0000-4000-8000-000000001301';

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001101',
  true
);
UPDATE public.fishing_trips
SET status = 'confirmed',
    confirmed_at = now()
WHERE id = '00000000-0000-4000-8000-000000001201';

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001103',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows
  FROM public.trip_private_details
  WHERE trip_id = '00000000-0000-4000-8000-000000001201';
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'Partecipante confirmed non vede lo spot privato';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001101',
  true
);
UPDATE public.fishing_trips
SET status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = 'Test cancellazione P0.11'
WHERE id = '00000000-0000-4000-8000-000000001201';

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001103',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows
  FROM public.trip_private_details
  WHERE trip_id = '00000000-0000-4000-8000-000000001201';
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION
      'Uscita cancellata mantiene accesso privato al partecipante';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000001101',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows
  FROM public.trip_private_details
  WHERE trip_id = '00000000-0000-4000-8000-000000001201';
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION
      'Organizzatore perde impropriamente i propri dettagli dopo cancellazione';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;
