BEGIN;

DROP POLICY trip_participants_select_own
ON public.trip_participants;

DROP POLICY trip_participants_select_trip_organizer
ON public.trip_participants;

CREATE POLICY trip_participants_select_own_or_organizer
ON public.trip_participants
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    JOIN public.app_users AS organizer
      ON organizer.id = trip.organizer_user_id
    WHERE trip.id = trip_participants.trip_id
      AND trip.organizer_user_id = (SELECT auth.uid())
      AND organizer.status = 'active'
  )
);

COMMIT;
