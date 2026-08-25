BEGIN;

DROP POLICY fishing_trips_select_own
ON public.fishing_trips;

DROP POLICY fishing_trips_select_confirmed_participant
ON public.fishing_trips;

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

COMMIT;
