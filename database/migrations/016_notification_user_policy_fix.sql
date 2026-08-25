BEGIN;

DROP POLICY notifications_select_own_or_admin
ON public.notifications;

CREATE POLICY notifications_select_own
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY notifications_update_own_or_admin
ON public.notifications;

CREATE POLICY notifications_update_own
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

COMMIT;
