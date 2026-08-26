BEGIN;

DROP FUNCTION public.list_trip_participation_requests(uuid);

CREATE FUNCTION public.list_trip_participation_requests(p_trip_id uuid)
RETURNS TABLE (
  participant_id uuid,
  participant_user_id uuid,
  display_name text,
  age_band text,
  municipality_name text,
  generic_zone text,
  skill_level text,
  technique_names text[],
  water_type text,
  bio text,
  profile_photo_key text,
  participation_status text,
  requested_at timestamptz,
  decided_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS organizer
      ON organizer.id = trip.organizer_user_id
    WHERE trip.id = p_trip_id
      AND trip.organizer_user_id = authenticated_user_id
      AND organizer.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Uscita non trovata o non gestibile'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    participant.id,
    participant.user_id,
    app_user.display_name,
    profile.age_band,
    profile.municipality_name,
    profile.generic_zone,
    profile.skill_level,
    COALESCE(techniques.names, ARRAY[]::text[]),
    profile.water_type,
    profile.bio,
    profile.profile_photo_key,
    participant.status,
    participant.requested_at,
    CASE participant.status
      WHEN 'accepted' THEN participant.accepted_at
      WHEN 'rejected' THEN participant.rejected_at
      WHEN 'cancelled' THEN participant.cancelled_at
      WHEN 'confirmed' THEN participant.confirmed_at
      ELSE NULL
    END
  FROM public.trip_participants AS participant
  JOIN public.app_users AS app_user
    ON app_user.id = participant.user_id
   AND app_user.status = 'active'
  LEFT JOIN public.fisher_profiles AS profile
    ON profile.user_id = participant.user_id
  LEFT JOIN LATERAL (
    SELECT array_agg(technique.name ORDER BY technique.sort_order, technique.name) AS names
    FROM public.user_fishing_techniques AS selected
    JOIN public.fishing_techniques AS technique
      ON technique.id = selected.technique_id
     AND technique.active
    WHERE selected.user_id = participant.user_id
  ) AS techniques ON true
  WHERE participant.trip_id = p_trip_id
  ORDER BY
    CASE participant.status
      WHEN 'requested' THEN 0
      WHEN 'accepted' THEN 1
      WHEN 'confirmed' THEN 2
      ELSE 3
    END,
    participant.requested_at;
END;
$$;

COMMENT ON FUNCTION public.list_trip_participation_requests(uuid)
IS 'Mini-profili dei richiedenti visibili esclusivamente all’organizzatore dell’uscita; non espone contatti o dati amministrativi.';

REVOKE ALL ON FUNCTION public.list_trip_participation_requests(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_trip_participation_requests(uuid)
TO authenticated;

CREATE POLICY trip_participants_select_trip_organizer
ON public.trip_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS organizer
      ON organizer.id = trip.organizer_user_id
    WHERE trip.id = trip_participants.trip_id
      AND trip.organizer_user_id = (SELECT auth.uid())
      AND organizer.status = 'active'
  )
);

CREATE POLICY profile_photos_select_request_organizer
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND EXISTS (
    SELECT 1
    FROM public.trip_participants AS participant
    JOIN public.fishing_trips AS trip
      ON trip.id = participant.trip_id
    WHERE trip.organizer_user_id = (SELECT auth.uid())
      AND participant.user_id::text = (storage.foldername(name))[1]
      AND participant.status IN ('requested', 'accepted', 'confirmed')
  )
);

COMMIT;
