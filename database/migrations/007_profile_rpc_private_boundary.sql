BEGIN;

-- La consistenza di completed_at è già aggiornata dai trigger sulle tabelle
-- relazionali. La RPC pubblica non deve invocare direttamente lo schema private.

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

REVOKE ALL ON FUNCTION save_fisher_profile(
  text, text, text, text, text, text, text, text, smallint, smallint[], smallint[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION save_fisher_profile(
  text, text, text, text, text, text, text, text, smallint, smallint[], smallint[]
) TO authenticated;

COMMIT;
