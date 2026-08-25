BEGIN;

ALTER TABLE public.trip_private_details
  ALTER COLUMN meeting_point_text SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trip_private_details_meeting_trimmed_length'
      AND conrelid = 'public.trip_private_details'::regclass
  ) THEN
    ALTER TABLE public.trip_private_details
      ADD CONSTRAINT trip_private_details_meeting_trimmed_length
      CHECK (char_length(trim(meeting_point_text)) BETWEEN 3 AND 500);
  END IF;
END;
$$;

CREATE POLICY fishing_trips_select_confirmed_participant
ON public.fishing_trips
FOR SELECT
TO authenticated
USING (
  status IN ('confirmed', 'completed')
  AND EXISTS (
    SELECT 1
    FROM public.app_users AS app_user
    WHERE app_user.id = (SELECT auth.uid())
      AND app_user.status = 'active'
  )
  AND EXISTS (
    SELECT 1
    FROM public.trip_participants AS participant
    WHERE participant.trip_id = fishing_trips.id
      AND participant.user_id = (SELECT auth.uid())
      AND participant.status IN ('confirmed', 'completed')
  )
);

ALTER POLICY trip_private_details_select_authorized
ON public.trip_private_details
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS app_user
      ON app_user.id = (SELECT auth.uid())
     AND app_user.status = 'active'
    WHERE trip.id = trip_private_details.trip_id
      AND (
        trip.organizer_user_id = (SELECT auth.uid())
        OR (
          trip.status IN ('confirmed', 'completed')
          AND EXISTS (
            SELECT 1
            FROM public.trip_participants AS participant
            WHERE participant.trip_id = trip.id
              AND participant.user_id = (SELECT auth.uid())
              AND participant.status IN ('confirmed', 'completed')
          )
        )
      )
  )
);

ALTER POLICY trip_private_details_insert_organizer
ON public.trip_private_details
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS organizer
      ON organizer.id = trip.organizer_user_id
     AND organizer.status = 'active'
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = (SELECT auth.uid())
      AND trip.status IN ('open', 'confirmed')
      AND trip.starts_at > now()
  )
);

ALTER POLICY trip_private_details_update_organizer
ON public.trip_private_details
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS organizer
      ON organizer.id = trip.organizer_user_id
     AND organizer.status = 'active'
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = (SELECT auth.uid())
      AND trip.status IN ('open', 'confirmed')
      AND trip.starts_at > now()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS organizer
      ON organizer.id = trip.organizer_user_id
     AND organizer.status = 'active'
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = (SELECT auth.uid())
      AND trip.status IN ('open', 'confirmed')
      AND trip.starts_at > now()
  )
);

DROP POLICY trip_private_details_delete_organizer
ON public.trip_private_details;

REVOKE ALL ON public.trip_private_details FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.trip_private_details TO authenticated;
GRANT INSERT (
  trip_id,
  meeting_point_text,
  exact_lat,
  exact_lon,
  private_notes
) ON public.trip_private_details TO authenticated;
GRANT UPDATE (
  meeting_point_text,
  exact_lat,
  exact_lon,
  private_notes
) ON public.trip_private_details TO authenticated;

CREATE OR REPLACE FUNCTION private.log_trip_private_details_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.app_events (
    event_type,
    actor_user_id,
    trip_id
  )
  VALUES (
    'trip_private_details_updated',
    authenticated_user_id,
    NEW.trip_id
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.log_trip_private_details_changed()
FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER trip_private_details_log_change
AFTER INSERT OR UPDATE OF meeting_point_text, exact_lat, exact_lon, private_notes
ON public.trip_private_details
FOR EACH ROW EXECUTE FUNCTION private.log_trip_private_details_changed();

COMMIT;
