BEGIN;

CREATE FUNCTION private.is_active_trip_organizer(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS organizer
      ON organizer.id = trip.organizer_user_id
    WHERE trip.id = p_trip_id
      AND trip.organizer_user_id = (SELECT auth.uid())
      AND organizer.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_trip_organizer(uuid)
FROM PUBLIC, anon, authenticated;

DROP POLICY trip_participants_select_own_or_organizer
ON public.trip_participants;

CREATE POLICY trip_participants_select_own_or_organizer
ON public.trip_participants
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT private.is_active_trip_organizer(trip_id))
);

COMMIT;
