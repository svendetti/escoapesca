BEGIN;

DROP INDEX fishing_trips_discovery_idx;
CREATE INDEX fishing_trips_discovery_idx
  ON fishing_trips (status, province_code, starts_at);

CREATE INDEX legal_acceptances_document_idx
  ON legal_acceptances (legal_document_id);
CREATE INDEX fisher_profiles_province_idx
  ON fisher_profiles (province_code);
CREATE INDEX fisher_profiles_municipality_idx
  ON fisher_profiles (municipality_code)
  WHERE municipality_code IS NOT NULL;
CREATE INDEX user_fishing_techniques_technique_idx
  ON user_fishing_techniques (technique_id);
CREATE INDEX user_availability_slot_idx
  ON user_availability (availability_slot_id);
CREATE INDEX user_roles_granted_by_idx
  ON user_roles (granted_by_user_id)
  WHERE granted_by_user_id IS NOT NULL;
CREATE INDEX fishing_trips_municipality_idx
  ON fishing_trips (municipality_code)
  WHERE municipality_code IS NOT NULL;
CREATE INDEX trip_participants_decided_by_idx
  ON trip_participants (decided_by_user_id)
  WHERE decided_by_user_id IS NOT NULL;
CREATE INDEX trip_feedback_author_idx
  ON trip_feedback (author_user_id, submitted_at DESC);
CREATE INDEX app_events_actor_idx
  ON app_events (actor_user_id, occurred_at DESC)
  WHERE actor_user_id IS NOT NULL;
CREATE INDEX app_events_trip_idx
  ON app_events (trip_id, occurred_at DESC)
  WHERE trip_id IS NOT NULL;
CREATE INDEX app_events_participant_idx
  ON app_events (participant_id)
  WHERE participant_id IS NOT NULL;
CREATE INDEX notifications_user_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_event_idx
  ON notifications (event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX notifications_trip_idx
  ON notifications (trip_id, created_at DESC)
  WHERE trip_id IS NOT NULL;
CREATE INDEX admin_actions_actor_idx
  ON admin_actions (actor_user_id, created_at DESC);
CREATE INDEX admin_actions_target_user_idx
  ON admin_actions (target_user_id, created_at DESC)
  WHERE target_user_id IS NOT NULL;
CREATE INDEX admin_actions_target_trip_idx
  ON admin_actions (target_trip_id, created_at DESC)
  WHERE target_trip_id IS NOT NULL;

ALTER POLICY trip_private_details_select_authorized
ON trip_private_details
USING (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND (
        trip.organizer_user_id = (SELECT current_app_user_id())
        OR (
          trip.status IN ('confirmed', 'completed')
          AND EXISTS (
            SELECT 1
            FROM trip_participants AS participant
            WHERE participant.trip_id = trip.id
              AND participant.user_id = (SELECT current_app_user_id())
              AND participant.status IN ('accepted', 'confirmed', 'completed')
          )
        )
      )
  )
);

ALTER POLICY trip_private_details_insert_organizer
ON trip_private_details
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = (SELECT current_app_user_id())
  )
);

ALTER POLICY trip_private_details_update_organizer
ON trip_private_details
USING (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = (SELECT current_app_user_id())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = (SELECT current_app_user_id())
  )
);

ALTER POLICY trip_private_details_delete_organizer
ON trip_private_details
USING (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = (SELECT current_app_user_id())
  )
);

ALTER POLICY notifications_select_own_or_admin
ON notifications
USING (
  user_id = (SELECT current_app_user_id())
  OR (SELECT current_user_is_admin())
);

ALTER POLICY notifications_update_own_or_admin
ON notifications
USING (
  user_id = (SELECT current_app_user_id())
  OR (SELECT current_user_is_admin())
)
WITH CHECK (
  user_id = (SELECT current_app_user_id())
  OR (SELECT current_user_is_admin())
);

ALTER POLICY trip_feedback_select_own_or_admin
ON trip_feedback
USING (
  author_user_id = (SELECT current_app_user_id())
  OR (SELECT current_user_is_admin())
);

ALTER POLICY trip_feedback_insert_eligible
ON trip_feedback
WITH CHECK (
  author_user_id = (SELECT current_app_user_id())
  AND EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_feedback.trip_id
      AND trip.ends_at <= now()
      AND (
        trip.organizer_user_id = (SELECT current_app_user_id())
        OR EXISTS (
          SELECT 1
          FROM trip_participants AS participant
          WHERE participant.trip_id = trip.id
            AND participant.user_id = (SELECT current_app_user_id())
            AND participant.status IN ('accepted', 'confirmed', 'completed')
        )
      )
  )
);

ALTER POLICY trip_feedback_update_own
ON trip_feedback
USING (author_user_id = (SELECT current_app_user_id()))
WITH CHECK (author_user_id = (SELECT current_app_user_id()));

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

COMMIT;
