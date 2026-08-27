BEGIN;

ALTER TABLE public.trip_participants
ADD COLUMN request_message text;

ALTER TABLE public.trip_participants
ADD CONSTRAINT trip_participants_request_message_check
CHECK (
  request_message IS NULL
  OR (
    request_message = btrim(request_message)
    AND char_length(request_message) BETWEEN 1 AND 300
  )
);

DROP FUNCTION public.request_trip_participation(uuid);

CREATE FUNCTION public.request_trip_participation(
  p_trip_id uuid,
  p_request_message text DEFAULT NULL
)
RETURNS TABLE (
  participant_id uuid,
  participation_status text,
  requested_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  normalized_request_message text := NULLIF(btrim(COALESCE(p_request_message, '')), '');
  selected_participant_id uuid;
  selected_status text;
  selected_requested_at timestamptz;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;

  IF char_length(normalized_request_message) > 300 THEN
    RAISE EXCEPTION 'Il messaggio può contenere al massimo 300 caratteri'
      USING ERRCODE = '22001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.app_users AS app_user
    JOIN public.fisher_profiles AS profile
      ON profile.user_id = app_user.id
    WHERE app_user.id = authenticated_user_id
      AND app_user.status = 'active'
      AND profile.completed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Completa il profilo prima di partecipare'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    WHERE trip.id = p_trip_id
      AND trip.organizer_user_id <> authenticated_user_id
      AND trip.status = 'open'
      AND trip.starts_at > now()
      AND (
        SELECT count(*)
        FROM public.trip_participants AS reserved
        WHERE reserved.trip_id = trip.id
          AND reserved.status IN ('accepted', 'confirmed', 'completed', 'no_show')
      ) < trip.max_participants - 1
  ) THEN
    RAISE EXCEPTION 'Uscita non disponibile per una nuova richiesta'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.trip_participants (
    trip_id,
    user_id,
    status,
    request_message
  )
  VALUES (
    p_trip_id,
    authenticated_user_id,
    'requested',
    normalized_request_message
  )
  ON CONFLICT (trip_id, user_id) DO UPDATE
  SET
    status = 'requested',
    request_message = normalized_request_message,
    requested_at = now(),
    cancelled_at = NULL,
    updated_at = now()
  WHERE public.trip_participants.status = 'cancelled'
  RETURNING id, status, public.trip_participants.requested_at
  INTO selected_participant_id, selected_status, selected_requested_at;

  IF selected_participant_id IS NULL THEN
    SELECT participant.id, participant.status, participant.requested_at
    INTO selected_participant_id, selected_status, selected_requested_at
    FROM public.trip_participants AS participant
    WHERE participant.trip_id = p_trip_id
      AND participant.user_id = authenticated_user_id;

    IF selected_status = 'requested' THEN
      RETURN QUERY
      SELECT selected_participant_id, selected_status, selected_requested_at;
      RETURN;
    END IF;

    RAISE EXCEPTION 'La richiesta non può essere inviata nello stato attuale'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.app_events (
    event_type,
    actor_user_id,
    trip_id,
    participant_id
  )
  VALUES (
    'participation_requested',
    authenticated_user_id,
    p_trip_id,
    selected_participant_id
  );

  RETURN QUERY
  SELECT selected_participant_id, selected_status, selected_requested_at;
END;
$$;

REVOKE ALL ON FUNCTION public.request_trip_participation(uuid, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_trip_participation(uuid, text)
TO authenticated;

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
  request_message text,
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
    participant.request_message,
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
IS 'Mini-profili e messaggio dei richiedenti visibili esclusivamente all’organizzatore dell’uscita.';

REVOKE ALL ON FUNCTION public.list_trip_participation_requests(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_trip_participation_requests(uuid)
TO authenticated;

COMMIT;
