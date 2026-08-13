BEGIN;

-- STEP 3: Supabase Auth e profilo pescatore. Le funzionalita relative alle
-- uscite restano deny-by-default fino agli step successivi.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

ALTER TABLE app_users
  ADD CONSTRAINT app_users_auth_user_fk
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE app_users
  ADD CONSTRAINT app_users_auth_subject_matches_id
  CHECK (auth_subject = id::text);

ALTER TABLE fisher_profiles
  ALTER COLUMN water_type DROP NOT NULL,
  ALTER COLUMN skill_level DROP NOT NULL;

CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  accepted_document_count integer;
BEGIN
  IF metadata ->> 'adult_confirmed' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Devi confermare di avere almeno 18 anni';
  END IF;

  IF metadata ->> 'privacy_accepted' IS DISTINCT FROM 'true'
     OR metadata ->> 'terms_accepted' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Privacy Policy e Termini devono essere accettati';
  END IF;

  INSERT INTO public.app_users (
    id, auth_subject, email, display_name, email_verified_at
  )
  VALUES (
    NEW.id,
    NEW.id::text,
    NEW.email,
    trim(metadata ->> 'display_name'),
    NEW.email_confirmed_at
  );

  INSERT INTO public.fisher_profiles (
    user_id,
    province_code,
    municipality_name,
    age_band,
    adult_confirmed,
    water_type,
    skill_level
  )
  VALUES (
    NEW.id,
    upper(trim(metadata ->> 'province_code')),
    trim(metadata ->> 'municipality_name'),
    metadata ->> 'age_band',
    true,
    NULL,
    NULL
  );

  INSERT INTO public.legal_acceptances (user_id, legal_document_id)
  SELECT NEW.id, current_document.id
  FROM (
    SELECT DISTINCT ON (document_type) id
    FROM public.legal_documents
    WHERE document_type IN ('privacy', 'terms')
      AND retired_at IS NULL
      AND published_at <= now()
    ORDER BY document_type, published_at DESC
  ) AS current_document;

  GET DIAGNOSTICS accepted_document_count = ROW_COUNT;
  IF accepted_document_count <> 2 THEN
    RAISE EXCEPTION 'Documenti legali attivi non configurati';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.app_users
  SET email = NEW.email, email_verified_at = NEW.email_confirmed_at
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

CREATE TRIGGER auth_user_synced
AFTER UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.sync_auth_user();

CREATE OR REPLACE FUNCTION private.recalculate_profile_completion(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.fisher_profiles AS profile
  SET completed_at = CASE
    WHEN profile.adult_confirmed
      AND profile.water_type IS NOT NULL
      AND profile.skill_level IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_fishing_techniques AS technique
        WHERE technique.user_id = target_user_id
      )
      AND EXISTS (
        SELECT 1
        FROM public.user_availability AS availability
        WHERE availability.user_id = target_user_id
      )
    THEN COALESCE(profile.completed_at, now())
    ELSE NULL
  END
  WHERE profile.user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.refresh_profile_completion_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM private.recalculate_profile_completion(OLD.user_id);
    RETURN OLD;
  END IF;

  PERFORM private.recalculate_profile_completion(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER fisher_profile_completion_refresh
AFTER UPDATE OF province_code, municipality_code, municipality_name, age_band,
  adult_confirmed, water_type, skill_level, travel_radius_km
ON fisher_profiles
FOR EACH ROW EXECUTE FUNCTION private.refresh_profile_completion_trigger();

CREATE TRIGGER user_techniques_completion_refresh
AFTER INSERT OR DELETE ON user_fishing_techniques
FOR EACH ROW EXECUTE FUNCTION private.refresh_profile_completion_trigger();

CREATE TRIGGER user_availability_completion_refresh
AFTER INSERT OR DELETE ON user_availability
FOR EACH ROW EXECUTE FUNCTION private.refresh_profile_completion_trigger();

CREATE OR REPLACE FUNCTION save_fisher_profile(
  p_display_name text,
  p_province_code text,
  p_municipality_name text,
  p_generic_zone text,
  p_age_band text,
  p_bio text,
  p_water_type text,
  p_skill_level text,
  p_travel_radius_km smallint,
  p_technique_ids smallint[],
  p_availability_slot_ids smallint[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(cardinality(p_technique_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Seleziona almeno una tecnica' USING ERRCODE = '23514';
  END IF;

  IF COALESCE(cardinality(p_availability_slot_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Seleziona almeno una disponibilita' USING ERRCODE = '23514';
  END IF;

  UPDATE public.app_users
  SET display_name = trim(p_display_name)
  WHERE id = authenticated_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profilo utente non trovato' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.fisher_profiles
  SET
    province_code = upper(trim(p_province_code)),
    municipality_code = NULL,
    municipality_name = trim(p_municipality_name),
    generic_zone = NULLIF(trim(p_generic_zone), ''),
    age_band = p_age_band,
    bio = NULLIF(trim(p_bio), ''),
    water_type = p_water_type,
    skill_level = p_skill_level,
    travel_radius_km = p_travel_radius_km
  WHERE user_id = authenticated_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profilo pescatore non trovato' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.user_fishing_techniques
  WHERE user_id = authenticated_user_id;

  INSERT INTO public.user_fishing_techniques (user_id, technique_id)
  SELECT authenticated_user_id, selected.technique_id
  FROM (SELECT DISTINCT unnest(p_technique_ids) AS technique_id) AS selected;

  DELETE FROM public.user_availability
  WHERE user_id = authenticated_user_id;

  INSERT INTO public.user_availability (user_id, availability_slot_id)
  SELECT authenticated_user_id, selected.availability_slot_id
  FROM (
    SELECT DISTINCT unnest(p_availability_slot_ids) AS availability_slot_id
  ) AS selected;

END;
$$;

-- Tutte le tabelle della Data API partono in deny-by-default.
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_acceptances FORCE ROW LEVEL SECURITY;
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE provinces FORCE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities FORCE ROW LEVEL SECURITY;
ALTER TABLE fishing_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_techniques FORCE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots FORCE ROW LEVEL SECURITY;
ALTER TABLE fisher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisher_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE user_fishing_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fishing_techniques FORCE ROW LEVEL SECURITY;
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability FORCE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE fishing_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_trips FORCE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_events FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions FORCE ROW LEVEL SECURITY;

ALTER VIEW public_fishing_trips SET (security_invoker = true);
ALTER VIEW beta_trip_outcome_evidence SET (security_invoker = true);
ALTER VIEW beta_real_fishing_trips SET (security_invoker = true);
ALTER VIEW beta_metrics SET (security_invoker = true);

CREATE POLICY app_users_select_own
ON app_users FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY app_users_update_own_active
ON app_users FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()) AND status = 'active')
WITH CHECK (id = (SELECT auth.uid()) AND status = 'active');

CREATE POLICY legal_documents_select_active
ON legal_documents FOR SELECT TO anon, authenticated
USING (retired_at IS NULL AND published_at <= now());

CREATE POLICY legal_acceptances_select_own
ON legal_acceptances FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY provinces_select_active
ON provinces FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY municipalities_select_active
ON municipalities FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY fishing_techniques_select_active
ON fishing_techniques FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY availability_slots_select_active
ON availability_slots FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY fisher_profiles_select_own
ON fisher_profiles FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY fisher_profiles_update_own_active
ON fisher_profiles FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM app_users
    WHERE id = (SELECT auth.uid()) AND status = 'active'
  )
)
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_fishing_techniques_select_own
ON user_fishing_techniques FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_fishing_techniques_insert_own
ON user_fishing_techniques FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_fishing_techniques_delete_own
ON user_fishing_techniques FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_availability_select_own
ON user_availability FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_availability_insert_own
ON user_availability FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_availability_delete_own
ON user_availability FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON legal_documents, provinces, municipalities,
  fishing_techniques, availability_slots TO anon, authenticated;
GRANT SELECT ON app_users, legal_acceptances, fisher_profiles,
  user_fishing_techniques, user_availability TO authenticated;
GRANT UPDATE (display_name) ON app_users TO authenticated;
GRANT UPDATE (
  province_code, municipality_code, municipality_name, generic_zone,
  age_band, profile_photo_key, bio, water_type, skill_level, travel_radius_km
) ON fisher_profiles TO authenticated;
GRANT INSERT, DELETE ON user_fishing_techniques, user_availability TO authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION current_app_user_id() TO authenticated;
REVOKE ALL ON FUNCTION save_fisher_profile(
  text, text, text, text, text, text, text, text, smallint, smallint[], smallint[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION save_fisher_profile(
  text, text, text, text, text, text, text, text, smallint, smallint[], smallint[]
) TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  false,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY profile_photos_select_own
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY profile_photos_insert_own
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY profile_photos_update_own
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY profile_photos_delete_own
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

COMMIT;
