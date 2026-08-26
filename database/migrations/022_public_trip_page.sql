BEGIN;

CREATE FUNCTION public.get_public_fishing_trip(p_trip_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  technique_name text,
  water_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  province_code text,
  province_name text,
  public_zone text,
  public_meeting_point text,
  max_participants smallint,
  available_places integer,
  recommended_level text,
  description text,
  trip_type text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    trip.id,
    trip.title,
    technique.name,
    trip.water_type,
    trip.starts_at,
    trip.ends_at,
    trip.province_code,
    province.name,
    trip.public_zone,
    CASE
      WHEN trip.trip_type = 'free' THEN trip.public_meeting_point
      ELSE NULL
    END,
    trip.max_participants,
    CASE
      WHEN trip.status = 'open' AND trip.starts_at > now()
        THEN GREATEST(trip.max_participants - 1 - reserved.reserved_places, 0)::integer
      ELSE NULL
    END,
    trip.recommended_level,
    trip.description,
    trip.trip_type,
    trip.status
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
   AND organizer.status = 'active'
  JOIN public.fishing_techniques AS technique
    ON technique.id = trip.technique_id
   AND technique.active
  JOIN public.provinces AS province
    ON province.code = trip.province_code
   AND province.active
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS reserved_places
    FROM public.trip_participants AS participant
    WHERE participant.trip_id = trip.id
      AND participant.status IN ('accepted', 'confirmed', 'completed', 'no_show')
  ) AS reserved ON true
  WHERE trip.id = p_trip_id
    AND trip.status <> 'draft';
$$;

COMMENT ON FUNCTION public.get_public_fishing_trip(uuid)
IS 'Restituisce il DTO pubblico minimo di una singola uscita tramite UUID stabile; non legge dettagli privati o dati personali dell’organizzatore.';

REVOKE ALL ON FUNCTION public.get_public_fishing_trip(uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_fishing_trip(uuid)
TO anon, authenticated;

COMMIT;
