BEGIN;

CREATE OR REPLACE FUNCTION public.list_trip_participation_requests(p_trip_id uuid)
RETURNS TABLE (
  participant_id uuid,
  participant_user_id uuid,
  display_name text,
  skill_level text,
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
    profile.skill_level,
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
  LEFT JOIN public.fisher_profiles AS profile
    ON profile.user_id = participant.user_id
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

CREATE OR REPLACE FUNCTION public.decide_trip_participation(
  p_participant_id uuid,
  p_decision text
)
RETURNS TABLE (
  participant_id uuid,
  participation_status text,
  decided_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  selected_trip_id uuid;
  current_status text;
  selected_max_participants smallint;
  reserved_places integer;
  decision_timestamp timestamptz := now();
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Decisione non valida' USING ERRCODE = '22023';
  END IF;

  SELECT
    participant.trip_id,
    participant.status,
    trip.max_participants
  INTO selected_trip_id, current_status, selected_max_participants
  FROM public.trip_participants AS participant
  JOIN public.fishing_trips AS trip
    ON trip.id = participant.trip_id
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
  WHERE participant.id = p_participant_id
    AND trip.organizer_user_id = authenticated_user_id
    AND trip.status = 'open'
    AND trip.starts_at > now()
    AND organizer.status = 'active'
  FOR UPDATE OF trip, participant;

  IF selected_trip_id IS NULL THEN
    RAISE EXCEPTION 'Richiesta non trovata o non gestibile'
      USING ERRCODE = '42501';
  END IF;

  IF current_status = p_decision THEN
    RETURN QUERY
    SELECT
      p_participant_id,
      current_status,
      CASE current_status
        WHEN 'accepted' THEN (
          SELECT accepted_at
          FROM public.trip_participants
          WHERE id = p_participant_id
        )
        ELSE (
          SELECT rejected_at
          FROM public.trip_participants
          WHERE id = p_participant_id
        )
      END;
    RETURN;
  END IF;

  IF current_status <> 'requested' THEN
    RAISE EXCEPTION 'La richiesta è già stata elaborata'
      USING ERRCODE = '23514';
  END IF;

  IF p_decision = 'accepted' THEN
    SELECT count(*)::integer
    INTO reserved_places
    FROM public.trip_participants AS reserved
    WHERE reserved.trip_id = selected_trip_id
      AND reserved.status IN ('accepted', 'confirmed', 'completed', 'no_show');

    IF reserved_places >= selected_max_participants - 1 THEN
      RAISE EXCEPTION 'Non ci sono più posti disponibili'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.trip_participants AS participant
  SET
    status = p_decision,
    accepted_at = CASE
      WHEN p_decision = 'accepted' THEN decision_timestamp
      ELSE participant.accepted_at
    END,
    rejected_at = CASE
      WHEN p_decision = 'rejected' THEN decision_timestamp
      ELSE participant.rejected_at
    END,
    decided_by_user_id = authenticated_user_id,
    updated_at = decision_timestamp
  WHERE participant.id = p_participant_id;

  INSERT INTO public.app_events (
    event_type,
    actor_user_id,
    trip_id,
    participant_id
  )
  VALUES (
    CASE p_decision
      WHEN 'accepted' THEN 'participation_accepted'
      ELSE 'participation_rejected'
    END,
    authenticated_user_id,
    selected_trip_id,
    p_participant_id
  );

  RETURN QUERY
  SELECT p_participant_id, p_decision, decision_timestamp;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_fishing_trip(p_trip_id uuid)
RETURNS TABLE (
  trip_status text,
  confirmed_at timestamptz,
  confirmed_participant_count integer
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  current_trip_status text;
  trip_starts_at timestamptz;
  existing_confirmed_at timestamptz;
  accepted_count integer;
  confirmation_timestamp timestamptz := now();
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;

  SELECT trip.status, trip.starts_at, trip.confirmed_at
  INTO current_trip_status, trip_starts_at, existing_confirmed_at
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
  WHERE trip.id = p_trip_id
    AND trip.organizer_user_id = authenticated_user_id
    AND organizer.status = 'active'
  FOR UPDATE OF trip;

  IF current_trip_status IS NULL THEN
    RAISE EXCEPTION 'Uscita non trovata o non gestibile'
      USING ERRCODE = '42501';
  END IF;

  IF current_trip_status = 'confirmed' THEN
    SELECT count(*)::integer
    INTO accepted_count
    FROM public.trip_participants AS participant
    WHERE participant.trip_id = p_trip_id
      AND participant.status = 'confirmed';

    RETURN QUERY
    SELECT current_trip_status, existing_confirmed_at, accepted_count;
    RETURN;
  END IF;

  IF current_trip_status <> 'open' OR trip_starts_at <= now() THEN
    RAISE EXCEPTION 'Questa uscita non può essere confermata'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*)::integer
  INTO accepted_count
  FROM public.trip_participants AS participant
  WHERE participant.trip_id = p_trip_id
    AND participant.status = 'accepted';

  IF accepted_count < 1 THEN
    RAISE EXCEPTION 'Accetta almeno un partecipante prima di confermare'
      USING ERRCODE = '23514';
  END IF;

  WITH rejected_requests AS (
    UPDATE public.trip_participants AS participant
    SET
      status = 'rejected',
      rejected_at = confirmation_timestamp,
      decided_by_user_id = authenticated_user_id,
      updated_at = confirmation_timestamp
    WHERE participant.trip_id = p_trip_id
      AND participant.status = 'requested'
    RETURNING participant.id
  )
  INSERT INTO public.app_events (
    event_type,
    actor_user_id,
    trip_id,
    participant_id
  )
  SELECT
    'participation_rejected',
    authenticated_user_id,
    p_trip_id,
    rejected.id
  FROM rejected_requests AS rejected;

  UPDATE public.trip_participants AS participant
  SET
    status = 'confirmed',
    confirmed_at = confirmation_timestamp,
    updated_at = confirmation_timestamp
  WHERE participant.trip_id = p_trip_id
    AND participant.status = 'accepted';

  UPDATE public.fishing_trips AS trip
  SET
    status = 'confirmed',
    confirmed_at = confirmation_timestamp,
    version = trip.version + 1,
    updated_at = confirmation_timestamp
  WHERE trip.id = p_trip_id;

  INSERT INTO public.app_events (
    event_type,
    actor_user_id,
    trip_id
  )
  VALUES (
    'trip_confirmed',
    authenticated_user_id,
    p_trip_id
  );

  RETURN QUERY
  SELECT 'confirmed'::text, confirmation_timestamp, accepted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.list_trip_participation_requests(uuid)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_trip_participation(uuid, text)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_fishing_trip(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_trip_participation_requests(uuid)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_trip_participation(uuid, text)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_fishing_trip(uuid)
TO authenticated;

COMMIT;
