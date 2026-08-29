BEGIN;

CREATE INDEX fishing_trips_hidden_by_admin_user_idx
  ON public.fishing_trips (hidden_by_admin_user_id)
  WHERE hidden_by_admin_user_id IS NOT NULL;

COMMIT;
