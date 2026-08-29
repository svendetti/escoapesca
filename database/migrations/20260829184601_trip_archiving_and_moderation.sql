BEGIN;

CREATE TABLE public.trip_history_preferences (
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.fishing_trips(id) ON DELETE CASCADE,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trip_id)
);

CREATE INDEX trip_history_preferences_trip_idx
  ON public.trip_history_preferences (trip_id);

ALTER TABLE public.trip_history_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.trip_history_preferences FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.trip_history_preferences
IS 'Preferenze personali per nascondere uscite concluse senza cancellare storico, feedback o audit.';

ALTER TABLE public.fishing_trips
  ADD COLUMN hidden_by_admin_at timestamptz,
  ADD COLUMN hidden_by_admin_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  ADD COLUMN hidden_by_admin_reason text;

ALTER TABLE public.fishing_trips
  ADD CONSTRAINT fishing_trips_admin_visibility_consistency
  CHECK (
    (
      hidden_by_admin_at IS NULL
      AND hidden_by_admin_user_id IS NULL
      AND hidden_by_admin_reason IS NULL
    )
    OR
    (
      hidden_by_admin_at IS NOT NULL
      AND hidden_by_admin_user_id IS NOT NULL
      AND char_length(hidden_by_admin_reason) BETWEEN 3 AND 1000
    )
  );

CREATE INDEX fishing_trips_visible_discovery_idx
  ON public.fishing_trips (status, starts_at, province_code)
  WHERE hidden_by_admin_at IS NULL;

DROP POLICY IF EXISTS fishing_trips_select_authorized ON public.fishing_trips;
CREATE POLICY fishing_trips_select_authorized
ON public.fishing_trips
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.app_users AS app_user
    WHERE app_user.id = (SELECT auth.uid())
      AND app_user.status = 'active'
  )
  AND (
    organizer_user_id = (SELECT auth.uid())
    OR (SELECT public.current_user_is_admin())
    OR (
      status IN ('confirmed', 'completed')
      AND EXISTS (
        SELECT 1
        FROM public.trip_participants AS participant
        WHERE participant.trip_id = fishing_trips.id
          AND participant.user_id = (SELECT auth.uid())
          AND participant.status IN ('confirmed', 'completed')
      )
    )
  )
);

CREATE FUNCTION public.list_my_hidden_trip_ids()
RETURNS TABLE (trip_id uuid, hidden_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_users AS app_user
    WHERE app_user.id = authenticated_user_id
      AND app_user.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT preference.trip_id, preference.hidden_at
  FROM public.trip_history_preferences AS preference
  WHERE preference.user_id = authenticated_user_id
  ORDER BY preference.hidden_at DESC;
END;
$$;

CREATE FUNCTION public.set_my_trip_history_hidden(
  p_trip_id uuid,
  p_hidden boolean
)
RETURNS TABLE (trip_id uuid, hidden boolean, changed_at timestamptz)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  selected_trip public.fishing_trips%ROWTYPE;
  participation_status text;
  action_time timestamptz := clock_timestamp();
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_users AS app_user
    WHERE app_user.id = authenticated_user_id
      AND app_user.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato' USING ERRCODE = '42501';
  END IF;

  SELECT trip.* INTO selected_trip
  FROM public.fishing_trips AS trip
  WHERE trip.id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Uscita non trovata' USING ERRCODE = 'P0002';
  END IF;

  SELECT participant.status INTO participation_status
  FROM public.trip_participants AS participant
  WHERE participant.trip_id = p_trip_id
    AND participant.user_id = authenticated_user_id;

  IF selected_trip.organizer_user_id <> authenticated_user_id
     AND participation_status IS NULL THEN
    RAISE EXCEPTION 'Non puoi gestire questa uscita nel tuo storico' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(p_hidden, false)
     AND selected_trip.ends_at > now()
     AND selected_trip.status NOT IN ('completed', 'cancelled')
     AND COALESCE(participation_status, '') NOT IN ('rejected', 'cancelled', 'completed', 'no_show') THEN
    RAISE EXCEPTION 'Puoi nascondere solo uscite concluse o non più attive' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(p_hidden, false) THEN
    INSERT INTO public.trip_history_preferences (user_id, trip_id, hidden_at)
    VALUES (authenticated_user_id, p_trip_id, action_time)
    ON CONFLICT (user_id, trip_id)
    DO UPDATE SET hidden_at = EXCLUDED.hidden_at;
  ELSE
    DELETE FROM public.trip_history_preferences AS preference
    WHERE preference.user_id = authenticated_user_id
      AND preference.trip_id = p_trip_id;
  END IF;

  RETURN QUERY SELECT p_trip_id, COALESCE(p_hidden, false), action_time;
END;
$$;

CREATE FUNCTION public.delete_my_fishing_trip_draft(p_trip_id uuid)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  deleted_trip_id uuid;
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_users AS app_user
    WHERE app_user.id = authenticated_user_id
      AND app_user.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.fishing_trips AS trip
  WHERE trip.id = p_trip_id
    AND trip.organizer_user_id = authenticated_user_id
    AND trip.status = 'draft'
    AND NOT EXISTS (
      SELECT 1 FROM public.trip_participants AS participant
      WHERE participant.trip_id = trip.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.trip_feedback AS feedback
      WHERE feedback.trip_id = trip.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_actions AS action
      WHERE action.target_trip_id = trip.id
    )
  RETURNING trip.id INTO deleted_trip_id;

  IF deleted_trip_id IS NULL THEN
    RAISE EXCEPTION 'È possibile eliminare soltanto una bozza senza attività collegata' USING ERRCODE = '22023';
  END IF;

  RETURN deleted_trip_id;
END;
$$;

CREATE FUNCTION public.admin_set_fishing_trip_visibility(
  p_trip_id uuid,
  p_hidden boolean,
  p_reason text
)
RETURNS TABLE (trip_id uuid, hidden boolean, changed_at timestamptz)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_user_id uuid := private.require_current_admin();
  normalized_reason text := trim(COALESCE(p_reason, ''));
  selected_trip public.fishing_trips%ROWTYPE;
  action_time timestamptz := clock_timestamp();
  action_id bigint;
BEGIN
  IF char_length(normalized_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'La motivazione deve contenere da 3 a 1000 caratteri' USING ERRCODE = '22023';
  END IF;

  SELECT trip.* INTO selected_trip
  FROM public.fishing_trips AS trip
  WHERE trip.id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Uscita non trovata' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(p_hidden, false) AND selected_trip.hidden_by_admin_at IS NOT NULL THEN
    RAISE EXCEPTION 'L''uscita è già oscurata' USING ERRCODE = '22023';
  END IF;

  IF NOT COALESCE(p_hidden, false) AND selected_trip.hidden_by_admin_at IS NULL THEN
    RAISE EXCEPTION 'L''uscita è già visibile' USING ERRCODE = '22023';
  END IF;

  UPDATE public.fishing_trips AS trip
  SET
    hidden_by_admin_at = CASE WHEN COALESCE(p_hidden, false) THEN action_time ELSE NULL END,
    hidden_by_admin_user_id = CASE WHEN COALESCE(p_hidden, false) THEN admin_user_id ELSE NULL END,
    hidden_by_admin_reason = CASE WHEN COALESCE(p_hidden, false) THEN normalized_reason ELSE NULL END,
    version = trip.version + 1
  WHERE trip.id = p_trip_id;

  INSERT INTO public.admin_actions (
    actor_user_id, action_type, target_trip_id, reason
  ) VALUES (
    admin_user_id,
    CASE WHEN COALESCE(p_hidden, false) THEN 'trip_hidden' ELSE 'trip_restored' END,
    p_trip_id,
    normalized_reason
  )
  RETURNING id INTO action_id;

  INSERT INTO public.notifications (
    user_id, trip_id, notification_type, payload, dedupe_key, email_status
  ) VALUES (
    selected_trip.organizer_user_id,
    p_trip_id,
    CASE WHEN COALESCE(p_hidden, false) THEN 'trip_hidden_by_admin' ELSE 'trip_restored_by_admin' END,
    jsonb_build_object('trip_title', selected_trip.title),
    format('admin-action:%s:user:%s', action_id, selected_trip.organizer_user_id),
    'skipped'
  );

  RETURN QUERY SELECT p_trip_id, COALESCE(p_hidden, false), action_time;
END;
$$;

ALTER FUNCTION public.get_admin_dashboard(integer) SET SCHEMA private;
ALTER FUNCTION private.get_admin_dashboard(integer) RENAME TO build_admin_dashboard_base;
REVOKE ALL ON FUNCTION private.build_admin_dashboard_base(integer)
FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_admin_dashboard(p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  dashboard jsonb;
  enriched_trips jsonb;
BEGIN
  PERFORM private.require_current_admin();
  dashboard := private.build_admin_dashboard_base(p_limit);

  SELECT COALESCE(jsonb_agg(
    trip_item || jsonb_build_object(
      'hidden_by_admin_at', trip.hidden_by_admin_at,
      'hidden_by_admin_reason', trip.hidden_by_admin_reason
    )
    ORDER BY trip_item->>'starts_at' DESC
  ), '[]'::jsonb)
  INTO enriched_trips
  FROM jsonb_array_elements(COALESCE(dashboard->'trips', '[]'::jsonb)) AS trip_item
  JOIN public.fishing_trips AS trip
    ON trip.id = (trip_item->>'id')::uuid;

  RETURN jsonb_set(dashboard, '{trips}', enriched_trips, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_fishing_trip(p_trip_id uuid)
RETURNS TABLE (
  id uuid, title text, technique_name text, water_type text,
  starts_at timestamptz, ends_at timestamptz, province_code text,
  province_name text, public_zone text, public_meeting_point text,
  max_participants smallint, available_places integer,
  recommended_level text, description text, trip_type text, status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    trip.id, trip.title, technique.name, trip.water_type,
    trip.starts_at, trip.ends_at, trip.province_code, province.name,
    trip.public_zone,
    CASE WHEN trip.trip_type = 'free' THEN trip.public_meeting_point ELSE NULL END,
    trip.max_participants,
    CASE
      WHEN trip.status = 'open' AND trip.starts_at > now()
        THEN GREATEST(trip.max_participants - 1 - reserved.reserved_places, 0)::integer
      ELSE NULL
    END,
    trip.recommended_level, trip.description, trip.trip_type, trip.status
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id AND organizer.status = 'active'
  JOIN public.fishing_techniques AS technique
    ON technique.id = trip.technique_id AND technique.active
  JOIN public.provinces AS province
    ON province.code = trip.province_code AND province.active
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS reserved_places
    FROM public.trip_participants AS participant
    WHERE participant.trip_id = trip.id
      AND participant.status IN ('accepted', 'confirmed', 'completed', 'no_show')
  ) AS reserved ON true
  WHERE trip.id = p_trip_id
    AND trip.status <> 'draft'
    AND trip.hidden_by_admin_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.search_fishing_trips(
  p_province_code text DEFAULT NULL,
  p_zone text DEFAULT NULL,
  p_technique_id smallint DEFAULT NULL,
  p_water_type text DEFAULT NULL,
  p_starts_from timestamptz DEFAULT NULL,
  p_starts_before timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid, organizer_user_id uuid, organizer_name text, title text,
  technique_id smallint, technique_name text, water_type text,
  starts_at timestamptz, ends_at timestamptz, province_code text,
  province_name text, public_zone text, max_participants smallint,
  available_places integer, recommended_level text, description text,
  trip_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  normalized_zone text := NULLIF(lower(trim(p_zone)), '');
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_users AS viewer
    WHERE viewer.id = authenticated_user_id AND viewer.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato' USING ERRCODE = '42501';
  END IF;

  IF normalized_zone IS NOT NULL AND char_length(normalized_zone) > 80 THEN
    RAISE EXCEPTION 'Filtro zona non valido' USING ERRCODE = '22023';
  END IF;

  IF p_starts_from IS NOT NULL AND p_starts_before IS NOT NULL
     AND p_starts_before <= p_starts_from THEN
    RAISE EXCEPTION 'Intervallo data non valido' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    trip.id, trip.organizer_user_id, organizer.display_name, trip.title,
    trip.technique_id, technique.name, trip.water_type, trip.starts_at,
    trip.ends_at, trip.province_code, province.name, trip.public_zone,
    trip.max_participants,
    GREATEST(trip.max_participants - 1 - reserved.reserved_places, 0)::integer,
    trip.recommended_level, trip.description, trip.trip_type
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id AND organizer.status = 'active'
  JOIN public.fishing_techniques AS technique
    ON technique.id = trip.technique_id AND technique.active
  JOIN public.provinces AS province
    ON province.code = trip.province_code
   AND province.region_code = 'LAZ' AND province.active
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS reserved_places
    FROM public.trip_participants AS participant
    WHERE participant.trip_id = trip.id
      AND participant.status IN ('accepted', 'confirmed', 'completed', 'no_show')
  ) AS reserved ON true
  WHERE trip.status = 'open'
    AND trip.hidden_by_admin_at IS NULL
    AND trip.starts_at >= GREATEST(now(), COALESCE(p_starts_from, now()))
    AND (p_starts_before IS NULL OR trip.starts_at < p_starts_before)
    AND (p_province_code IS NULL OR trip.province_code = upper(trim(p_province_code)))
    AND (normalized_zone IS NULL OR strpos(lower(trip.public_zone), normalized_zone) > 0)
    AND (p_technique_id IS NULL OR trip.technique_id = p_technique_id)
    AND (p_water_type IS NULL OR trip.water_type = p_water_type)
    AND reserved.reserved_places < trip.max_participants - 1
  ORDER BY trip.starts_at ASC, trip.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_hidden_trip_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_trip_history_hidden(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_fishing_trip_draft(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_fishing_trip_visibility(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_dashboard(integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_my_hidden_trip_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_trip_history_hidden(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_fishing_trip_draft(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_fishing_trip_visibility(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard(integer) TO authenticated;

COMMIT;
