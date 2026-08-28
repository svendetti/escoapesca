BEGIN;

CREATE OR REPLACE FUNCTION public.admin_reset_operational_data(
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  required_confirmation CONSTANT text := 'ELIMINA USCITE';
  users_preserved integer;
  trips_deleted integer;
  participations_deleted integer;
  private_details_deleted integer;
  feedback_deleted integer;
  notifications_deleted integer;
  events_deleted integer;
  email_deliveries_deleted integer;
  admin_actions_deleted integer;
BEGIN
  PERFORM private.require_current_admin();

  IF upper(trim(COALESCE(p_confirmation, ''))) <> required_confirmation THEN
    RAISE EXCEPTION 'Conferma reset non valida'
      USING ERRCODE = '22023';
  END IF;

  LOCK TABLE
    public.fishing_trips,
    public.trip_participants,
    public.trip_private_details,
    public.trip_feedback,
    public.app_events,
    public.notifications,
    public.email_outbox,
    public.admin_actions
  IN ACCESS EXCLUSIVE MODE;

  SELECT count(*)::integer
  INTO users_preserved
  FROM public.app_users;

  DELETE FROM public.email_outbox;
  GET DIAGNOSTICS email_deliveries_deleted = ROW_COUNT;

  DELETE FROM public.notifications;
  GET DIAGNOSTICS notifications_deleted = ROW_COUNT;

  DELETE FROM public.admin_actions;
  GET DIAGNOSTICS admin_actions_deleted = ROW_COUNT;

  DELETE FROM public.app_events;
  GET DIAGNOSTICS events_deleted = ROW_COUNT;

  DELETE FROM public.trip_feedback;
  GET DIAGNOSTICS feedback_deleted = ROW_COUNT;

  DELETE FROM public.trip_private_details;
  GET DIAGNOSTICS private_details_deleted = ROW_COUNT;

  DELETE FROM public.trip_participants;
  GET DIAGNOSTICS participations_deleted = ROW_COUNT;

  DELETE FROM public.fishing_trips;
  GET DIAGNOSTICS trips_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'users_preserved', users_preserved,
    'trips_deleted', trips_deleted,
    'participations_deleted', participations_deleted,
    'private_details_deleted', private_details_deleted,
    'feedback_deleted', feedback_deleted,
    'notifications_deleted', notifications_deleted,
    'events_deleted', events_deleted,
    'email_deliveries_deleted', email_deliveries_deleted,
    'admin_actions_deleted', admin_actions_deleted,
    'operational_rows_deleted',
      trips_deleted
      + participations_deleted
      + private_details_deleted
      + feedback_deleted
      + notifications_deleted
      + events_deleted
      + email_deliveries_deleted
      + admin_actions_deleted
  );
END;
$$;

COMMENT ON FUNCTION public.admin_reset_operational_data(text)
IS 'Reset distruttivo admin-only dei dati operativi Beta; preserva utenti, profili, preferenze, consensi, ruoli e cataloghi.';

REVOKE ALL ON FUNCTION public.admin_reset_operational_data(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_operational_data(text)
TO authenticated;

COMMIT;
