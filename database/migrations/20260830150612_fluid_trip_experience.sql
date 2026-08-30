BEGIN;

ALTER TABLE public.fishing_trips
ADD COLUMN public_code text,
ADD COLUMN title_is_custom boolean NOT NULL DEFAULT true,
ADD COLUMN end_precision text NOT NULL DEFAULT 'datetime';

UPDATE public.fishing_trips
SET public_code = 'EP-' || upper(substr(replace(id::text, '-', ''), 1, 10))
WHERE public_code IS NULL;

ALTER TABLE public.fishing_trips
ALTER COLUMN public_code SET NOT NULL;

ALTER TABLE public.fishing_trips
ADD CONSTRAINT fishing_trips_public_code_unique UNIQUE (public_code),
ADD CONSTRAINT fishing_trips_public_code_format CHECK (public_code ~ '^EP-[0-9A-F]{10}$'),
ADD CONSTRAINT fishing_trips_end_precision_check CHECK (end_precision IN ('date', 'datetime'));

ALTER TABLE public.fishing_trips
DROP CONSTRAINT fishing_trips_description_length;

ALTER TABLE public.fishing_trips
ADD CONSTRAINT fishing_trips_description_length
CHECK (char_length(description) <= 3000);

CREATE FUNCTION private.assign_fishing_trip_public_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.public_code IS NULL THEN
    LOOP
      NEW.public_code := 'EP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.fishing_trips AS trip
        WHERE trip.public_code = NEW.public_code
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.assign_fishing_trip_public_code()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER fishing_trips_assign_public_code
BEFORE INSERT ON public.fishing_trips
FOR EACH ROW
EXECUTE FUNCTION private.assign_fishing_trip_public_code();

GRANT SELECT (public_code, title_is_custom, end_precision)
ON public.fishing_trips TO authenticated;

GRANT INSERT (title_is_custom, end_precision)
ON public.fishing_trips TO authenticated;

GRANT UPDATE (title_is_custom, end_precision)
ON public.fishing_trips TO authenticated;

DROP FUNCTION public.search_fishing_trips(
  text, text, smallint, text, timestamptz, timestamptz, integer
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
  public_code text,
  organizer_user_id uuid,
  organizer_name text,
  organizer_profile_photo_key text,
  title text,
  technique_id smallint,
  technique_name text,
  water_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  end_precision text,
  province_code text,
  province_name text,
  public_zone text,
  max_participants smallint,
  available_places integer,
  participant_count integer,
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
    SELECT 1 FROM public.app_users AS viewer
    WHERE viewer.id = authenticated_user_id AND viewer.status = 'active'
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
    trip.public_code,
    trip.organizer_user_id,
    organizer.display_name,
    organizer_profile.profile_photo_key,
    trip.title,
    trip.technique_id,
    technique.name,
    trip.water_type,
    trip.starts_at,
    trip.ends_at,
    trip.end_precision,
    trip.province_code,
    province.name,
    trip.public_zone,
    trip.max_participants,
    GREATEST(trip.max_participants - 1 - reserved.reserved_places, 0)::integer,
    (1 + reserved.reserved_places)::integer,
    trip.recommended_level,
    trip.description,
    trip.trip_type
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
   AND organizer.status = 'active'
  LEFT JOIN public.fisher_profiles AS organizer_profile
    ON organizer_profile.user_id = trip.organizer_user_id
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

REVOKE ALL ON FUNCTION public.search_fishing_trips(
  text, text, smallint, text, timestamptz, timestamptz, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_fishing_trips(
  text, text, smallint, text, timestamptz, timestamptz, integer
) TO authenticated;

DROP FUNCTION public.get_public_fishing_trip(uuid);

CREATE FUNCTION public.get_public_fishing_trip(p_trip_id uuid)
RETURNS TABLE (
  id uuid,
  public_code text,
  title text,
  technique_name text,
  water_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  end_precision text,
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
    trip.public_code,
    trip.title,
    technique.name,
    trip.water_type,
    trip.starts_at,
    trip.ends_at,
    trip.end_precision,
    trip.province_code,
    province.name,
    trip.public_zone,
    CASE WHEN trip.trip_type = 'free' THEN trip.public_meeting_point ELSE NULL END,
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
    AND trip.status <> 'draft'
    AND trip.hidden_by_admin_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_public_fishing_trip(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_fishing_trip(uuid) TO anon, authenticated;

DROP FUNCTION public.list_my_trip_participations();

CREATE FUNCTION public.list_my_trip_participations()
RETURNS TABLE (
  participant_id uuid,
  participation_status text,
  requested_at timestamptz,
  participant_updated_at timestamptz,
  trip_id uuid,
  public_code text,
  organizer_user_id uuid,
  organizer_name text,
  title text,
  technique_id smallint,
  technique_name text,
  water_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  end_precision text,
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
    SELECT 1 FROM public.app_users AS viewer
    WHERE viewer.id = authenticated_user_id AND viewer.status = 'active'
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
    trip.public_code,
    trip.organizer_user_id,
    organizer.display_name,
    trip.title,
    trip.technique_id,
    technique.name,
    trip.water_type,
    trip.starts_at,
    trip.ends_at,
    trip.end_precision,
    trip.province_code,
    trip.public_zone,
    trip.max_participants,
    trip.recommended_level,
    trip.trip_type,
    trip.status
  FROM public.trip_participants AS participant
  JOIN public.fishing_trips AS trip ON trip.id = participant.trip_id
  JOIN public.app_users AS organizer ON organizer.id = trip.organizer_user_id
  JOIN public.fishing_techniques AS technique ON technique.id = trip.technique_id
  WHERE participant.user_id = authenticated_user_id
  ORDER BY trip.starts_at ASC, participant.requested_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_trip_participations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_trip_participations() TO authenticated;

CREATE FUNCTION public.get_trip_organizer_summary(p_trip_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  profile_photo_key text
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
    SELECT 1 FROM public.app_users AS viewer
    WHERE viewer.id = authenticated_user_id AND viewer.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT organizer.id, organizer.display_name, profile.profile_photo_key
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
   AND organizer.status = 'active'
  LEFT JOIN public.fisher_profiles AS profile ON profile.user_id = organizer.id
  WHERE trip.id = p_trip_id
    AND (
      trip.organizer_user_id = authenticated_user_id
      OR (
        trip.hidden_by_admin_at IS NULL
        AND trip.status = 'open'
        AND trip.starts_at > now()
      )
      OR EXISTS (
        SELECT 1 FROM public.trip_participants AS participant
        WHERE participant.trip_id = trip.id
          AND participant.user_id = authenticated_user_id
          AND participant.status IN ('accepted', 'confirmed', 'completed')
      )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_trip_organizer_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trip_organizer_summary(uuid) TO authenticated;

CREATE FUNCTION public.list_trip_group_members(p_trip_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  member_role text,
  participation_status text
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
    SELECT 1 FROM public.fishing_trips AS trip
    WHERE trip.id = p_trip_id
      AND (
        trip.organizer_user_id = authenticated_user_id
        OR EXISTS (
          SELECT 1 FROM public.trip_participants AS viewer
          WHERE viewer.trip_id = trip.id
            AND viewer.user_id = authenticated_user_id
            AND viewer.status IN ('accepted', 'confirmed', 'completed')
        )
      )
  ) THEN
    RAISE EXCEPTION 'Gruppo non accessibile' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT organizer.id, organizer.display_name, 'organizer'::text, NULL::text
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
   AND organizer.status = 'active'
  WHERE trip.id = p_trip_id

  UNION ALL

  SELECT member.id, member.display_name, 'participant'::text, participant.status
  FROM public.trip_participants AS participant
  JOIN public.app_users AS member
    ON member.id = participant.user_id
   AND member.status = 'active'
  WHERE participant.trip_id = p_trip_id
    AND participant.status IN ('accepted', 'confirmed', 'completed')
  ORDER BY member_role ASC, display_name;
END;
$$;

REVOKE ALL ON FUNCTION public.list_trip_group_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_trip_group_members(uuid) TO authenticated;

CREATE POLICY profile_photos_select_visible_trip_organizer
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS organizer
      ON organizer.id = trip.organizer_user_id
     AND organizer.status = 'active'
    JOIN public.fisher_profiles AS profile
      ON profile.user_id = organizer.id
     AND profile.profile_photo_key = name
    WHERE trip.organizer_user_id::text = (storage.foldername(name))[1]
      AND trip.hidden_by_admin_at IS NULL
      AND trip.status IN ('open', 'confirmed')
      AND trip.ends_at > now()
  )
);

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
          NEW.title, NEW.title_is_custom, NEW.technique_id, NEW.water_type,
          NEW.starts_at, NEW.ends_at, NEW.end_precision, NEW.province_code,
          NEW.public_zone, NEW.public_meeting_point, NEW.max_participants,
          NEW.recommended_level, NEW.description, NEW.gear_notes, NEW.trip_type
        ) IS DISTINCT FROM ROW(
          OLD.title, OLD.title_is_custom, OLD.technique_id, OLD.water_type,
          OLD.starts_at, OLD.ends_at, OLD.end_precision, OLD.province_code,
          OLD.public_zone, OLD.public_meeting_point, OLD.max_participants,
          OLD.recommended_level, OLD.description, OLD.gear_notes, OLD.trip_type
        ) THEN
    changed_event_type := 'trip_updated';
  END IF;

  IF changed_event_type IS NOT NULL THEN
    INSERT INTO public.app_events (event_type, actor_user_id, trip_id)
    VALUES (changed_event_type, auth.uid(), NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.log_fishing_trip_notification_event()
FROM PUBLIC, anon, authenticated;

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
  trip_code text;
  actor_name text;
  recipient_id uuid;
  notification_payload jsonb;
BEGIN
  SELECT event.* INTO selected_event
  FROM public.app_events AS event
  WHERE event.id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR selected_event.processed_at IS NOT NULL THEN RETURN; END IF;

  SELECT trip.organizer_user_id, trip.title, trip.public_code
  INTO organizer_id, trip_title, trip_code
  FROM public.fishing_trips AS trip
  WHERE trip.id = selected_event.trip_id;

  SELECT participant.user_id INTO participant_user_id
  FROM public.trip_participants AS participant
  WHERE participant.id = selected_event.participant_id;

  SELECT app_user.display_name INTO actor_name
  FROM public.app_users AS app_user
  WHERE app_user.id = selected_event.actor_user_id;

  notification_payload := jsonb_strip_nulls(jsonb_build_object(
    'trip_title', CASE WHEN trip_code IS NULL THEN trip_title ELSE format('%s · %s', trip_title, trip_code) END,
    'actor_name', actor_name
  ));

  IF selected_event.event_type IN ('participation_requested', 'participation_cancelled') THEN
    IF organizer_id IS NOT NULL AND organizer_id IS DISTINCT FROM selected_event.actor_user_id THEN
      INSERT INTO public.notifications (user_id, event_id, trip_id, notification_type, payload, dedupe_key)
      VALUES (organizer_id, selected_event.id, selected_event.trip_id, selected_event.event_type,
        notification_payload, format('event:%s:user:%s', selected_event.id, organizer_id))
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  ELSIF selected_event.event_type IN ('participation_accepted', 'participation_rejected') THEN
    IF participant_user_id IS NOT NULL AND participant_user_id IS DISTINCT FROM selected_event.actor_user_id THEN
      INSERT INTO public.notifications (user_id, event_id, trip_id, notification_type, payload, dedupe_key)
      VALUES (participant_user_id, selected_event.id, selected_event.trip_id, selected_event.event_type,
        notification_payload, format('event:%s:user:%s', selected_event.id, participant_user_id))
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  ELSIF selected_event.event_type IN (
    'trip_confirmed', 'trip_updated', 'trip_cancelled', 'trip_private_details_updated'
  ) THEN
    FOR recipient_id IN
      SELECT DISTINCT participant.user_id
      FROM public.trip_participants AS participant
      JOIN public.app_users AS app_user ON app_user.id = participant.user_id AND app_user.status = 'active'
      WHERE participant.trip_id = selected_event.trip_id
        AND participant.user_id IS DISTINCT FROM selected_event.actor_user_id
        AND (
          (selected_event.event_type IN ('trip_confirmed', 'trip_private_details_updated')
            AND participant.status IN ('confirmed', 'completed'))
          OR (selected_event.event_type IN ('trip_updated', 'trip_cancelled')
            AND participant.status IN ('requested', 'accepted', 'confirmed', 'completed'))
        )
    LOOP
      INSERT INTO public.notifications (user_id, event_id, trip_id, notification_type, payload, dedupe_key)
      VALUES (recipient_id, selected_event.id, selected_event.trip_id, selected_event.event_type,
        notification_payload, format('event:%s:user:%s', selected_event.id, recipient_id))
      ON CONFLICT (dedupe_key) DO NOTHING;
    END LOOP;
  ELSIF selected_event.event_type IN ('feedback_requested', 'feedback_reminder') THEN
    recipient_id := NULLIF(selected_event.payload ->> 'recipient_user_id', '')::uuid;
    IF recipient_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.app_users AS app_user WHERE app_user.id = recipient_id AND app_user.status = 'active')
      AND NOT EXISTS (
        SELECT 1 FROM public.trip_feedback AS feedback
        WHERE feedback.trip_id = selected_event.trip_id AND feedback.author_user_id = recipient_id
      )
    THEN
      INSERT INTO public.notifications (user_id, event_id, trip_id, notification_type, payload, dedupe_key)
      VALUES (recipient_id, selected_event.id, selected_event.trip_id, selected_event.event_type,
        notification_payload, format('event:%s:user:%s', selected_event.id, recipient_id))
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  END IF;

  UPDATE public.app_events AS event
  SET processed_at = clock_timestamp(), processing_attempts = event.processing_attempts + 1
  WHERE event.id = selected_event.id;
END;
$$;

REVOKE ALL ON FUNCTION private.process_app_event(bigint)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.create_trip_invitation_notification_after_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient_id uuid;
  trip_title text;
  trip_code text;
  actor_name text;
BEGIN
  IF NEW.event_type <> 'trip_invitation_sent' THEN RETURN NEW; END IF;

  recipient_id := NULLIF(NEW.payload ->> 'recipient_user_id', '')::uuid;
  IF recipient_id IS NULL
    OR recipient_id IS NOT DISTINCT FROM NEW.actor_user_id
    OR NOT EXISTS (
      SELECT 1 FROM public.app_users AS app_user
      WHERE app_user.id = recipient_id AND app_user.status = 'active'
    )
  THEN
    RETURN NEW;
  END IF;

  SELECT trip.title, trip.public_code INTO trip_title, trip_code
  FROM public.fishing_trips AS trip WHERE trip.id = NEW.trip_id;
  SELECT app_user.display_name INTO actor_name
  FROM public.app_users AS app_user WHERE app_user.id = NEW.actor_user_id;

  INSERT INTO public.notifications (user_id, event_id, trip_id, notification_type, payload, dedupe_key)
  VALUES (
    recipient_id, NEW.id, NEW.trip_id, NEW.event_type,
    jsonb_strip_nulls(jsonb_build_object(
      'trip_title', CASE WHEN trip_code IS NULL THEN trip_title ELSE format('%s · %s', trip_title, trip_code) END,
      'actor_name', actor_name
    )),
    format('event:%s:user:%s', NEW.id, recipient_id)
  )
  ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.create_trip_invitation_notification_after_event()
FROM PUBLIC, anon, authenticated;

COMMIT;
