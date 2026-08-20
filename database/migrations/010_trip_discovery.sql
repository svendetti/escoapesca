BEGIN;

CREATE OR REPLACE FUNCTION public.search_fishing_trips(
  p_province_code text DEFAULT NULL,
  p_technique_id smallint DEFAULT NULL,
  p_water_type text DEFAULT NULL,
  p_starts_from timestamptz DEFAULT NULL,
  p_starts_before timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  organizer_user_id uuid,
  organizer_name text,
  title text,
  technique_id smallint,
  technique_name text,
  water_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  province_code text,
  province_name text,
  public_zone text,
  max_participants smallint,
  available_places integer,
  recommended_level text,
  description text,
  trip_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.app_users AS viewer
    WHERE viewer.id = authenticated_user_id
      AND viewer.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    trip.id,
    trip.organizer_user_id,
    organizer.display_name,
    trip.title,
    trip.technique_id,
    technique.name,
    trip.water_type,
    trip.starts_at,
    trip.ends_at,
    trip.province_code,
    province.name,
    trip.public_zone,
    trip.max_participants,
    GREATEST(trip.max_participants - 1 - reserved.reserved_places, 0)::integer,
    trip.recommended_level,
    trip.description,
    trip.trip_type
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
   AND organizer.status = 'active'
  JOIN public.fishing_techniques AS technique
    ON technique.id = trip.technique_id
   AND technique.active
  JOIN public.provinces AS province
    ON province.code = trip.province_code
   AND province.region_code = 'LAZ'
   AND province.active
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS reserved_places
    FROM public.trip_participants AS participant
    WHERE participant.trip_id = trip.id
      AND participant.status IN ('accepted', 'confirmed', 'completed', 'no_show')
  ) AS reserved ON true
  WHERE trip.status = 'open'
    AND trip.starts_at >= GREATEST(now(), COALESCE(p_starts_from, now()))
    AND (p_starts_before IS NULL OR trip.starts_at < p_starts_before)
    AND (p_province_code IS NULL OR trip.province_code = upper(trim(p_province_code)))
    AND (p_technique_id IS NULL OR trip.technique_id = p_technique_id)
    AND (p_water_type IS NULL OR trip.water_type = p_water_type)
    AND reserved.reserved_places < trip.max_participants - 1
  ORDER BY trip.starts_at ASC, trip.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
END;
$$;

COMMENT ON FUNCTION public.search_fishing_trips(
  text, smallint, text, timestamptz, timestamptz, integer
) IS 'Elenco sicuro delle prossime uscite aperte per utenti attivi; non espone dettagli privati dello spot.';

REVOKE ALL ON FUNCTION public.search_fishing_trips(
  text, smallint, text, timestamptz, timestamptz, integer
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.search_fishing_trips(
  text, smallint, text, timestamptz, timestamptz, integer
) TO authenticated;

COMMIT;
