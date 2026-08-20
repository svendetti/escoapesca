BEGIN;

CREATE POLICY trip_participants_select_own
ON public.trip_participants
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.trip_participants FROM authenticated;
GRANT SELECT ON public.trip_participants TO authenticated;

CREATE OR REPLACE FUNCTION public.request_trip_participation(p_trip_id uuid)
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
  selected_participant_id uuid;
  selected_status text;
  selected_requested_at timestamptz;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
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

  INSERT INTO public.trip_participants (trip_id, user_id, status)
  VALUES (p_trip_id, authenticated_user_id, 'requested')
  ON CONFLICT (trip_id, user_id) DO UPDATE
  SET
    status = 'requested',
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

CREATE OR REPLACE FUNCTION public.cancel_trip_participation(p_trip_id uuid)
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
  selected_participant_id uuid;
  selected_status text;
  selected_requested_at timestamptz;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;

  UPDATE public.trip_participants AS participant
  SET
    status = 'cancelled',
    cancelled_at = now(),
    updated_at = now()
  WHERE participant.trip_id = p_trip_id
    AND participant.user_id = authenticated_user_id
    AND participant.status = 'requested'
  RETURNING participant.id, participant.status, participant.requested_at
  INTO selected_participant_id, selected_status, selected_requested_at;

  IF selected_participant_id IS NULL THEN
    SELECT participant.id, participant.status, participant.requested_at
    INTO selected_participant_id, selected_status, selected_requested_at
    FROM public.trip_participants AS participant
    WHERE participant.trip_id = p_trip_id
      AND participant.user_id = authenticated_user_id;

    IF selected_status = 'cancelled' THEN
      RETURN QUERY
      SELECT selected_participant_id, selected_status, selected_requested_at;
      RETURN;
    END IF;

    RAISE EXCEPTION 'Non esiste una richiesta annullabile'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.app_events (
    event_type,
    actor_user_id,
    trip_id,
    participant_id
  )
  VALUES (
    'participation_cancelled',
    authenticated_user_id,
    p_trip_id,
    selected_participant_id
  );

  RETURN QUERY
  SELECT selected_participant_id, selected_status, selected_requested_at;
END;
$$;

REVOKE ALL ON FUNCTION public.request_trip_participation(uuid)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_trip_participation(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.request_trip_participation(uuid)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trip_participation(uuid)
TO authenticated;

COMMIT;
