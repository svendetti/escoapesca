BEGIN;

DROP POLICY IF EXISTS fishing_trips_select_authorized
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
    OR EXISTS (
      SELECT 1
      FROM public.user_roles AS role_assignment
      WHERE role_assignment.user_id = (SELECT auth.uid())
        AND role_assignment.role = 'admin'
    )
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
