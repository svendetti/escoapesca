BEGIN;

-- Queste tabelle sono superfici interne. I ruoli client non hanno privilegi
-- diretti e le policy esplicite mantengono il deny-by-default anche in caso di
-- grant accidentali futuri.
REVOKE ALL ON TABLE public.admin_actions
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.app_events
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.email_outbox
FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS admin_actions_client_deny_all
ON public.admin_actions;
CREATE POLICY admin_actions_client_deny_all
ON public.admin_actions
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS app_events_client_deny_all
ON public.app_events;
CREATE POLICY app_events_client_deny_all
ON public.app_events
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS email_outbox_client_deny_all
ON public.email_outbox;
CREATE POLICY email_outbox_client_deny_all
ON public.email_outbox
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMENT ON POLICY admin_actions_client_deny_all
ON public.admin_actions
IS 'P0.11: tabella di audit amministrativo non accessibile ai ruoli client.';
COMMENT ON POLICY app_events_client_deny_all
ON public.app_events
IS 'P0.11: event log interno non accessibile ai ruoli client.';
COMMENT ON POLICY email_outbox_client_deny_all
ON public.email_outbox
IS 'P0.11: stato, destinatari ed errori delivery non accessibili ai ruoli client.';

-- Ribadisce il confine delle RPC SECURITY DEFINER client-facing.
REVOKE ALL ON FUNCTION public.admin_cancel_fishing_trip(uuid, text)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid, text, text)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_dashboard(integer)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_trip_participation(uuid)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_fishing_trip(uuid)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_trip_participation(uuid, text)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_trip_feedback()
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_trip_participations()
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_trip_participation_requests(uuid)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_trip_participation(uuid, text)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_fishing_trips(
  text, text, smallint, text, timestamptz, timestamptz, integer
)
FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_trip_feedback(
  uuid, boolean, boolean, boolean, smallint, text
)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.get_public_fishing_trip(uuid)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_fishing_trip(uuid)
TO anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_email_deliveries(integer)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_email_delivery(uuid, boolean, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_deliveries(integer)
TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_email_delivery(uuid, boolean, text, text)
TO service_role;

REVOKE USAGE ON SCHEMA private
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_active_trip_organizer(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_trip_organizer(uuid)
TO authenticated;

COMMIT;
