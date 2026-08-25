BEGIN;

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

GRANT SELECT (user_id, role) ON public.user_roles TO authenticated;

CREATE OR REPLACE FUNCTION private.require_current_admin()
RETURNS uuid
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
    FROM public.app_users AS app_user
    JOIN public.user_roles AS user_role ON user_role.user_id = app_user.id
    WHERE app_user.id = authenticated_user_id
      AND app_user.status = 'active'
      AND user_role.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso riservato agli amministratori' USING ERRCODE = '42501';
  END IF;

  RETURN authenticated_user_id;
END;
$$;

REVOKE ALL ON FUNCTION private.require_current_admin() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard(p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
BEGIN
  PERFORM private.require_current_admin();

  RETURN jsonb_build_object(
    'metrics', COALESCE(
      (SELECT to_jsonb(metric) FROM public.beta_metrics AS metric),
      '{}'::jsonb
    ),
    'users', COALESCE((
      SELECT jsonb_agg(to_jsonb(user_row) ORDER BY user_row.created_at DESC)
      FROM (
        SELECT
          app_user.id,
          app_user.email,
          app_user.display_name,
          app_user.status,
          app_user.is_test,
          profile.province_code,
          profile.municipality_name,
          profile.completed_at AS profile_completed_at,
          app_user.email_verified_at,
          app_user.disabled_at,
          app_user.created_at
        FROM public.app_users AS app_user
        LEFT JOIN public.fisher_profiles AS profile ON profile.user_id = app_user.id
        ORDER BY app_user.created_at DESC
        LIMIT requested_limit
      ) AS user_row
    ), '[]'::jsonb),
    'trips', COALESCE((
      SELECT jsonb_agg(to_jsonb(trip_row) ORDER BY trip_row.starts_at DESC)
      FROM (
        SELECT
          trip.id,
          trip.title,
          trip.organizer_user_id,
          organizer.display_name AS organizer_name,
          technique.name AS technique_name,
          trip.status,
          trip.starts_at,
          trip.ends_at,
          trip.province_code,
          trip.public_zone,
          trip.trip_type,
          trip.max_participants,
          COALESCE(participants.total_count, 0)::integer AS participant_count,
          COALESCE(participants.pending_count, 0)::integer AS pending_count,
          COALESCE(participants.accepted_count, 0)::integer AS accepted_count,
          trip.created_at
        FROM public.fishing_trips AS trip
        JOIN public.app_users AS organizer ON organizer.id = trip.organizer_user_id
        JOIN public.fishing_techniques AS technique ON technique.id = trip.technique_id
        LEFT JOIN LATERAL (
          SELECT
            count(*) AS total_count,
            count(*) FILTER (WHERE participant.status = 'requested') AS pending_count,
            count(*) FILTER (WHERE participant.status IN ('accepted', 'confirmed', 'completed')) AS accepted_count
          FROM public.trip_participants AS participant
          WHERE participant.trip_id = trip.id
        ) AS participants ON true
        ORDER BY trip.starts_at DESC
        LIMIT requested_limit
      ) AS trip_row
    ), '[]'::jsonb),
    'participations', COALESCE((
      SELECT jsonb_agg(to_jsonb(participation_row) ORDER BY participation_row.requested_at DESC)
      FROM (
        SELECT
          participant.id,
          participant.trip_id,
          trip.title AS trip_title,
          participant.user_id,
          app_user.display_name AS user_name,
          participant.status,
          participant.requested_at,
          participant.updated_at
        FROM public.trip_participants AS participant
        JOIN public.fishing_trips AS trip ON trip.id = participant.trip_id
        JOIN public.app_users AS app_user ON app_user.id = participant.user_id
        ORDER BY participant.requested_at DESC
        LIMIT requested_limit
      ) AS participation_row
    ), '[]'::jsonb),
    'feedback', COALESCE((
      SELECT jsonb_agg(to_jsonb(feedback_row) ORDER BY feedback_row.submitted_at DESC)
      FROM (
        SELECT
          feedback.id,
          feedback.trip_id,
          trip.title AS trip_title,
          feedback.author_user_id,
          app_user.display_name AS author_name,
          feedback.trip_happened,
          feedback.met_new_fisher,
          feedback.would_repeat,
          feedback.rating,
          feedback.comment,
          feedback.submitted_at
        FROM public.trip_feedback AS feedback
        JOIN public.fishing_trips AS trip ON trip.id = feedback.trip_id
        JOIN public.app_users AS app_user ON app_user.id = feedback.author_user_id
        ORDER BY feedback.submitted_at DESC
        LIMIT requested_limit
      ) AS feedback_row
    ), '[]'::jsonb),
    'actions', COALESCE((
      SELECT jsonb_agg(to_jsonb(action_row) ORDER BY action_row.created_at DESC)
      FROM (
        SELECT
          action.id,
          action.action_type,
          action.actor_user_id,
          actor.display_name AS actor_name,
          action.target_user_id,
          target_user.display_name AS target_user_name,
          action.target_trip_id,
          target_trip.title AS target_trip_title,
          action.reason,
          action.created_at
        FROM public.admin_actions AS action
        JOIN public.app_users AS actor ON actor.id = action.actor_user_id
        LEFT JOIN public.app_users AS target_user ON target_user.id = action.target_user_id
        LEFT JOIN public.fishing_trips AS target_trip ON target_trip.id = action.target_trip_id
        ORDER BY action.created_at DESC
        LIMIT requested_limit
      ) AS action_row
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text
)
RETURNS TABLE (
  target_user_id uuid,
  user_status text,
  status_changed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_user_id uuid := private.require_current_admin();
  normalized_status text := lower(trim(COALESCE(p_status, '')));
  normalized_reason text := trim(COALESCE(p_reason, ''));
  current_status text;
BEGIN
  IF normalized_status NOT IN ('active', 'disabled') THEN
    RAISE EXCEPTION 'Stato utente non valido' USING ERRCODE = '22023';
  END IF;

  IF char_length(normalized_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'La motivazione deve contenere da 3 a 1000 caratteri' USING ERRCODE = '22023';
  END IF;

  SELECT app_user.status
  INTO current_status
  FROM public.app_users AS app_user
  WHERE app_user.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utente non trovato' USING ERRCODE = 'P0002';
  END IF;

  IF p_user_id = admin_user_id AND normalized_status = 'disabled' THEN
    RAISE EXCEPTION 'Non puoi disabilitare il tuo account amministratore' USING ERRCODE = '42501';
  END IF;

  IF current_status = normalized_status THEN
    RAISE EXCEPTION 'L''utente ha già lo stato richiesto' USING ERRCODE = '22023';
  END IF;

  UPDATE public.app_users AS app_user
  SET
    status = normalized_status,
    disabled_at = CASE WHEN normalized_status = 'disabled' THEN now() ELSE NULL END
  WHERE app_user.id = p_user_id
  RETURNING
    app_user.id,
    app_user.status,
    COALESCE(app_user.disabled_at, app_user.updated_at)
  INTO target_user_id, user_status, status_changed_at;

  INSERT INTO public.admin_actions (
    actor_user_id,
    action_type,
    target_user_id,
    reason
  )
  VALUES (
    admin_user_id,
    CASE WHEN normalized_status = 'disabled' THEN 'user_disabled' ELSE 'user_reenabled' END,
    p_user_id,
    normalized_reason
  );

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_fishing_trip(
  p_trip_id uuid,
  p_reason text
)
RETURNS TABLE (
  cancelled_trip_id uuid,
  trip_status text,
  cancelled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_user_id uuid := private.require_current_admin();
  normalized_reason text := trim(COALESCE(p_reason, ''));
  previous_status text;
BEGIN
  IF char_length(normalized_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'La motivazione deve contenere da 3 a 1000 caratteri' USING ERRCODE = '22023';
  END IF;

  SELECT trip.status
  INTO previous_status
  FROM public.fishing_trips AS trip
  WHERE trip.id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Uscita non trovata' USING ERRCODE = 'P0002';
  END IF;

  IF previous_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Questa uscita non può essere annullata' USING ERRCODE = '22023';
  END IF;

  UPDATE public.fishing_trips AS trip
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = normalized_reason,
    version = trip.version + 1
  WHERE trip.id = p_trip_id
  RETURNING trip.id, trip.status, trip.cancelled_at
  INTO cancelled_trip_id, trip_status, cancelled_at;

  -- Il trigger esistente crea già l'evento per open -> cancelled.
  IF previous_status <> 'open' THEN
    INSERT INTO public.app_events (event_type, actor_user_id, trip_id, payload)
    VALUES (
      'trip_cancelled',
      admin_user_id,
      p_trip_id,
      jsonb_build_object('moderated', true)
    );
  END IF;

  INSERT INTO public.admin_actions (
    actor_user_id,
    action_type,
    target_trip_id,
    reason
  )
  VALUES (
    admin_user_id,
    'trip_moderated_cancelled',
    p_trip_id,
    normalized_reason
  );

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cancel_fishing_trip(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_fishing_trip(uuid, text) TO authenticated;

COMMIT;
