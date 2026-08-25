BEGIN;

CREATE OR REPLACE FUNCTION public.list_my_trip_participations()
RETURNS TABLE (
  participant_id uuid,
  participation_status text,
  requested_at timestamptz,
  participant_updated_at timestamptz,
  trip_id uuid,
  organizer_user_id uuid,
  organizer_name text,
  title text,
  technique_id smallint,
  technique_name text,
  water_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  province_code text,
  public_zone text,
  max_participants smallint,
  recommended_level text,
  trip_type text,
  trip_status text
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
    participant.id,
    participant.status,
    participant.requested_at,
    participant.updated_at,
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
    trip.public_zone,
    trip.max_participants,
    trip.recommended_level,
    trip.trip_type,
    trip.status
  FROM public.trip_participants AS participant
  JOIN public.fishing_trips AS trip
    ON trip.id = participant.trip_id
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
  JOIN public.fishing_techniques AS technique
    ON technique.id = trip.technique_id
  WHERE participant.user_id = authenticated_user_id
  ORDER BY trip.starts_at ASC, participant.requested_at ASC;
END;
$$;

COMMENT ON FUNCTION public.list_my_trip_participations()
IS 'Riepilogo pubblico delle uscite a cui partecipa l’utente autenticato; non espone punto d’incontro, coordinate o note private.';

REVOKE ALL ON FUNCTION public.list_my_trip_participations()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_my_trip_participations()
TO authenticated;

COMMIT;
