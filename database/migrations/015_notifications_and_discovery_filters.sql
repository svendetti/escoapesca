BEGIN;

GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.notifications TO authenticated;

DROP POLICY notifications_select_own_or_admin
ON public.notifications;

CREATE POLICY notifications_select_own_or_admin
ON public.notifications
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT public.current_app_user_id())
  OR (SELECT public.current_user_is_admin())
);

DROP POLICY notifications_update_own_or_admin
ON public.notifications;

CREATE POLICY notifications_update_own_or_admin
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT public.current_app_user_id())
  OR (SELECT public.current_user_is_admin())
)
WITH CHECK (
  user_id = (SELECT public.current_app_user_id())
  OR (SELECT public.current_user_is_admin())
);

CREATE OR REPLACE FUNCTION private.process_app_event(p_event_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_event public.app_events%ROWTYPE;
  organizer_id uuid;
  participant_user_id uuid;
  trip_title text;
  actor_name text;
  recipient_id uuid;
  notification_payload jsonb;
BEGIN
  SELECT event.*
  INTO selected_event
  FROM public.app_events AS event
  WHERE event.id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR selected_event.processed_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT trip.organizer_user_id, trip.title
  INTO organizer_id, trip_title
  FROM public.fishing_trips AS trip
  WHERE trip.id = selected_event.trip_id;

  SELECT participant.user_id
  INTO participant_user_id
  FROM public.trip_participants AS participant
  WHERE participant.id = selected_event.participant_id;

  SELECT app_user.display_name
  INTO actor_name
  FROM public.app_users AS app_user
  WHERE app_user.id = selected_event.actor_user_id;

  notification_payload := jsonb_strip_nulls(jsonb_build_object(
    'trip_title', trip_title,
    'actor_name', actor_name
  ));

  IF selected_event.event_type IN ('participation_requested', 'participation_cancelled') THEN
    IF organizer_id IS NOT NULL
       AND organizer_id IS DISTINCT FROM selected_event.actor_user_id THEN
      INSERT INTO public.notifications (
        user_id,
        event_id,
        trip_id,
        notification_type,
        payload,
        dedupe_key
      )
      VALUES (
        organizer_id,
        selected_event.id,
        selected_event.trip_id,
        selected_event.event_type,
        notification_payload,
        format('event:%s:user:%s', selected_event.id, organizer_id)
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  ELSIF selected_event.event_type IN ('participation_accepted', 'participation_rejected') THEN
    IF participant_user_id IS NOT NULL
       AND participant_user_id IS DISTINCT FROM selected_event.actor_user_id THEN
      INSERT INTO public.notifications (
        user_id,
        event_id,
        trip_id,
        notification_type,
        payload,
        dedupe_key
      )
      VALUES (
        participant_user_id,
        selected_event.id,
        selected_event.trip_id,
        selected_event.event_type,
        notification_payload,
        format('event:%s:user:%s', selected_event.id, participant_user_id)
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  ELSIF selected_event.event_type IN (
    'trip_confirmed',
    'trip_updated',
    'trip_cancelled',
    'trip_private_details_updated'
  ) THEN
    FOR recipient_id IN
      SELECT DISTINCT participant.user_id
      FROM public.trip_participants AS participant
      JOIN public.app_users AS app_user
        ON app_user.id = participant.user_id
       AND app_user.status = 'active'
      WHERE participant.trip_id = selected_event.trip_id
        AND participant.user_id IS DISTINCT FROM selected_event.actor_user_id
        AND (
          (
            selected_event.event_type IN ('trip_confirmed', 'trip_private_details_updated')
            AND participant.status IN ('confirmed', 'completed')
          )
          OR (
            selected_event.event_type IN ('trip_updated', 'trip_cancelled')
            AND participant.status IN ('requested', 'accepted', 'confirmed', 'completed')
          )
        )
    LOOP
      INSERT INTO public.notifications (
        user_id,
        event_id,
        trip_id,
        notification_type,
        payload,
        dedupe_key
      )
      VALUES (
        recipient_id,
        selected_event.id,
        selected_event.trip_id,
        selected_event.event_type,
        notification_payload,
        format('event:%s:user:%s', selected_event.id, recipient_id)
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END LOOP;
  END IF;

  UPDATE public.app_events AS event
  SET
    processed_at = clock_timestamp(),
    processing_attempts = event.processing_attempts + 1
  WHERE event.id = selected_event.id;
END;
$$;

REVOKE ALL ON FUNCTION private.process_app_event(bigint)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.process_app_event_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM private.process_app_event(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.app_events AS event
    SET processing_attempts = event.processing_attempts + 1
    WHERE event.id = NEW.id;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.process_app_event_after_insert()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER app_events_create_notifications
AFTER INSERT ON public.app_events
FOR EACH ROW
EXECUTE FUNCTION private.process_app_event_after_insert();

CREATE OR REPLACE FUNCTION private.log_fishing_trip_notification_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  changed_event_type text;
BEGIN
  IF OLD.status = 'open' AND NEW.status = 'cancelled' THEN
    changed_event_type := 'trip_cancelled';
  ELSIF OLD.status = 'open'
        AND NEW.status = 'open'
        AND ROW(
          NEW.title,
          NEW.technique_id,
          NEW.water_type,
          NEW.starts_at,
          NEW.ends_at,
          NEW.province_code,
          NEW.public_zone,
          NEW.public_meeting_point,
          NEW.max_participants,
          NEW.recommended_level,
          NEW.description,
          NEW.gear_notes,
          NEW.trip_type
        ) IS DISTINCT FROM ROW(
          OLD.title,
          OLD.technique_id,
          OLD.water_type,
          OLD.starts_at,
          OLD.ends_at,
          OLD.province_code,
          OLD.public_zone,
          OLD.public_meeting_point,
          OLD.max_participants,
          OLD.recommended_level,
          OLD.description,
          OLD.gear_notes,
          OLD.trip_type
        ) THEN
    changed_event_type := 'trip_updated';
  END IF;

  IF changed_event_type IS NOT NULL THEN
    INSERT INTO public.app_events (
      event_type,
      actor_user_id,
      trip_id
    )
    VALUES (
      changed_event_type,
      auth.uid(),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.log_fishing_trip_notification_event()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER fishing_trips_log_notification_event
AFTER UPDATE ON public.fishing_trips
FOR EACH ROW
EXECUTE FUNCTION private.log_fishing_trip_notification_event();

DO $$
DECLARE
  pending_event_id bigint;
BEGIN
  FOR pending_event_id IN
    SELECT event.id
    FROM public.app_events AS event
    WHERE event.processed_at IS NULL
    ORDER BY event.id
  LOOP
    PERFORM private.process_app_event(pending_event_id);
  END LOOP;
END;
$$;

DROP FUNCTION public.search_fishing_trips(
  text, smallint, text, timestamptz, timestamptz, integer
);

CREATE FUNCTION public.search_fishing_trips(
  p_province_code text DEFAULT NULL,
  p_zone text DEFAULT NULL,
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
  normalized_zone text := NULLIF(lower(trim(p_zone)), '');
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.app_users AS viewer
    WHERE viewer.id = authenticated_user_id
      AND viewer.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato' USING ERRCODE = '42501';
  END IF;

  IF normalized_zone IS NOT NULL AND char_length(normalized_zone) > 80 THEN
    RAISE EXCEPTION 'Filtro zona non valido' USING ERRCODE = '22023';
  END IF;

  IF p_starts_from IS NOT NULL
     AND p_starts_before IS NOT NULL
     AND p_starts_before <= p_starts_from THEN
    RAISE EXCEPTION 'Intervallo data non valido' USING ERRCODE = '22023';
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
    AND (normalized_zone IS NULL OR strpos(lower(trip.public_zone), normalized_zone) > 0)
    AND (p_technique_id IS NULL OR trip.technique_id = p_technique_id)
    AND (p_water_type IS NULL OR trip.water_type = p_water_type)
    AND reserved.reserved_places < trip.max_participants - 1
  ORDER BY trip.starts_at ASC, trip.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
END;
$$;

COMMENT ON FUNCTION public.search_fishing_trips(
  text, text, smallint, text, timestamptz, timestamptz, integer
) IS 'Elenco sicuro delle prossime uscite aperte filtrabile per provincia, zona, tecnica, acqua e data; non espone dettagli privati.';

REVOKE ALL ON FUNCTION public.search_fishing_trips(
  text, text, smallint, text, timestamptz, timestamptz, integer
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.search_fishing_trips(
  text, text, smallint, text, timestamptz, timestamptz, integer
) TO authenticated;

COMMIT;
