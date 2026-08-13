BEGIN;

ALTER TABLE app_events
  ADD CONSTRAINT app_events_no_private_spot_payload CHECK (
    NOT (payload ?| ARRAY['exact_lat', 'exact_lon', 'meeting_point_text', 'private_notes'])
  );

ALTER TABLE notifications
  ADD CONSTRAINT notifications_no_private_spot_payload CHECK (
    NOT (payload ?| ARRAY['exact_lat', 'exact_lon', 'meeting_point_text', 'private_notes'])
  );

CREATE TRIGGER app_users_set_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fisher_profiles_set_updated_at
BEFORE UPDATE ON fisher_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fishing_trips_set_updated_at
BEFORE UPDATE ON fishing_trips
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trip_private_details_set_updated_at
BEFORE UPDATE ON trip_private_details
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trip_participants_set_updated_at
BEFORE UPDATE ON trip_participants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trip_feedback_set_updated_at
BEFORE UPDATE ON trip_feedback
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE VIEW public_fishing_trips
WITH (security_barrier = true)
AS
SELECT
  trip.id,
  trip.title,
  trip.organizer_user_id,
  organizer.display_name AS organizer_name,
  trip.technique_id,
  technique.slug AS technique_slug,
  technique.name AS technique_name,
  trip.water_type,
  trip.starts_at,
  trip.ends_at,
  trip.province_code,
  province.name AS province_name,
  trip.public_zone,
  CASE
    WHEN trip.trip_type = 'free' THEN trip.public_meeting_point
    ELSE NULL
  END AS public_meeting_point,
  trip.max_participants,
  GREATEST(trip.max_participants - 1 - reserved.reserved_places, 0) AS available_places,
  trip.recommended_level,
  trip.description,
  trip.gear_notes,
  trip.trip_type,
  trip.status,
  trip.created_at,
  trip.updated_at
FROM fishing_trips AS trip
JOIN app_users AS organizer ON organizer.id = trip.organizer_user_id
JOIN fishing_techniques AS technique ON technique.id = trip.technique_id
JOIN provinces AS province ON province.code = trip.province_code
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS reserved_places
  FROM trip_participants AS participant
  WHERE participant.trip_id = trip.id
    AND participant.status IN ('accepted', 'confirmed', 'completed', 'no_show')
) AS reserved ON true
WHERE organizer.status = 'active';

COMMENT ON VIEW public_fishing_trips IS
  'Superficie pubblica delle uscite. Non legge trip_private_details.';

CREATE VIEW beta_trip_outcome_evidence
WITH (security_barrier = true)
AS
SELECT
  trip.id AS trip_id,
  COALESCE(
    bool_or(
      feedback.author_user_id = trip.organizer_user_id
      AND feedback.trip_happened
    ),
    false
  ) AS organizer_reported_happened,
  COALESCE(
    bool_or(
      feedback.author_user_id <> trip.organizer_user_id
      AND feedback.trip_happened
      AND EXISTS (
        SELECT 1
        FROM trip_participants AS participant
        WHERE participant.trip_id = trip.id
          AND participant.user_id = feedback.author_user_id
      )
    ),
    false
  ) AS participant_reported_happened,
  COALESCE(
    bool_or(
      feedback.author_user_id <> trip.organizer_user_id
      AND feedback.trip_happened
      AND feedback.met_new_fisher
      AND EXISTS (
        SELECT 1
        FROM trip_participants AS participant
        WHERE participant.trip_id = trip.id
          AND participant.user_id = feedback.author_user_id
      )
    ),
    false
  ) AS participant_met_new_fisher,
  count(feedback.id) FILTER (WHERE feedback.trip_happened) AS positive_feedback_count
FROM fishing_trips AS trip
LEFT JOIN trip_feedback AS feedback ON feedback.trip_id = trip.id
GROUP BY trip.id;

CREATE VIEW beta_real_fishing_trips
WITH (security_barrier = true)
AS
SELECT
  trip_id,
  positive_feedback_count
FROM beta_trip_outcome_evidence
WHERE organizer_reported_happened
  AND participant_reported_happened
  AND participant_met_new_fisher;

CREATE VIEW beta_metrics
WITH (security_barrier = true)
AS
WITH eligible_users AS (
  SELECT id
  FROM app_users
  WHERE NOT is_test
),
eligible_trips AS (
  SELECT trip.id
  FROM fishing_trips AS trip
  JOIN eligible_users AS organizer ON organizer.id = trip.organizer_user_id
),
eligible_real_trips AS (
  SELECT real_trip.trip_id
  FROM beta_real_fishing_trips AS real_trip
  JOIN eligible_trips AS trip ON trip.id = real_trip.trip_id
),
eligible_reported_trips AS (
  SELECT evidence.trip_id
  FROM beta_trip_outcome_evidence AS evidence
  JOIN eligible_trips AS trip ON trip.id = evidence.trip_id
  WHERE evidence.organizer_reported_happened
     OR evidence.participant_reported_happened
),
accepted_users AS (
  SELECT DISTINCT participant.user_id
  FROM trip_participants AS participant
  JOIN eligible_users AS app_user ON app_user.id = participant.user_id
  WHERE participant.accepted_at IS NOT NULL
),
repeat_users AS (
  SELECT feedback.author_user_id
  FROM trip_feedback AS feedback
  JOIN eligible_real_trips AS real_trip ON real_trip.trip_id = feedback.trip_id
  JOIN eligible_users AS app_user ON app_user.id = feedback.author_user_id
  WHERE feedback.trip_happened
  GROUP BY feedback.author_user_id
  HAVING count(DISTINCT feedback.trip_id) >= 2
),
totals AS (
  SELECT
    (SELECT count(*) FROM eligible_users) AS registered_users,
    (
      SELECT count(*)
      FROM fisher_profiles AS profile
      JOIN eligible_users AS app_user ON app_user.id = profile.user_id
      WHERE profile.completed_at IS NOT NULL
    ) AS completed_profiles,
    (SELECT count(*) FROM eligible_trips) AS created_trips,
    (
      SELECT count(*)
      FROM trip_participants AS participant
      JOIN eligible_users AS app_user ON app_user.id = participant.user_id
    ) AS participation_requests,
    (
      SELECT count(*)
      FROM trip_participants AS participant
      JOIN eligible_users AS app_user ON app_user.id = participant.user_id
      WHERE participant.accepted_at IS NOT NULL
    ) AS accepted_requests,
    (
      SELECT count(*)
      FROM fishing_trips AS trip
      JOIN eligible_trips AS eligible_trip ON eligible_trip.id = trip.id
      WHERE trip.confirmed_at IS NOT NULL
    ) AS confirmed_trips,
    (SELECT count(*) FROM eligible_reported_trips) AS reported_trips,
    (SELECT count(*) FROM eligible_real_trips) AS real_trips,
    (SELECT count(*) FROM repeat_users) AS repeat_participants,
    (SELECT count(*) FROM accepted_users) AS users_with_accepted_participation
)
SELECT
  registered_users,
  completed_profiles,
  created_trips,
  participation_requests,
  accepted_requests,
  confirmed_trips,
  reported_trips,
  real_trips,
  repeat_participants,
  users_with_accepted_participation,
  round(
    users_with_accepted_participation::numeric / NULLIF(registered_users, 0),
    4
  ) AS registered_to_participation_ratio,
  round(
    real_trips::numeric / NULLIF(created_trips, 0),
    4
  ) AS created_to_real_trip_ratio
FROM totals;

ALTER TABLE trip_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_private_details FORCE ROW LEVEL SECURITY;

CREATE POLICY trip_private_details_select_authorized
ON trip_private_details
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND (
        trip.organizer_user_id = current_app_user_id()
        OR (
          trip.status IN ('confirmed', 'completed')
          AND EXISTS (
            SELECT 1
            FROM trip_participants AS participant
            WHERE participant.trip_id = trip.id
              AND participant.user_id = current_app_user_id()
              AND participant.status IN ('accepted', 'confirmed', 'completed')
          )
        )
      )
  )
);

CREATE POLICY trip_private_details_insert_organizer
ON trip_private_details
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = current_app_user_id()
  )
);

CREATE POLICY trip_private_details_update_organizer
ON trip_private_details
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = current_app_user_id()
  )
);

CREATE POLICY trip_private_details_delete_organizer
ON trip_private_details
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_private_details.trip_id
      AND trip.organizer_user_id = current_app_user_id()
  )
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own_or_admin
ON notifications
FOR SELECT
USING (user_id = current_app_user_id() OR current_user_is_admin());

CREATE POLICY notifications_update_own_or_admin
ON notifications
FOR UPDATE
USING (user_id = current_app_user_id() OR current_user_is_admin())
WITH CHECK (user_id = current_app_user_id() OR current_user_is_admin());

ALTER TABLE trip_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_feedback FORCE ROW LEVEL SECURITY;

CREATE POLICY trip_feedback_select_own_or_admin
ON trip_feedback
FOR SELECT
USING (author_user_id = current_app_user_id() OR current_user_is_admin());

CREATE POLICY trip_feedback_insert_eligible
ON trip_feedback
FOR INSERT
WITH CHECK (
  author_user_id = current_app_user_id()
  AND EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = trip_feedback.trip_id
      AND trip.ends_at <= now()
      AND (
        trip.organizer_user_id = current_app_user_id()
        OR EXISTS (
          SELECT 1
          FROM trip_participants AS participant
          WHERE participant.trip_id = trip.id
            AND participant.user_id = current_app_user_id()
            AND participant.status IN ('accepted', 'confirmed', 'completed')
        )
      )
  )
);

CREATE POLICY trip_feedback_update_own
ON trip_feedback
FOR UPDATE
USING (author_user_id = current_app_user_id())
WITH CHECK (author_user_id = current_app_user_id());

REVOKE ALL ON TABLE app_users FROM PUBLIC;
REVOKE ALL ON TABLE legal_documents FROM PUBLIC;
REVOKE ALL ON TABLE legal_acceptances FROM PUBLIC;
REVOKE ALL ON TABLE fisher_profiles FROM PUBLIC;
REVOKE ALL ON TABLE user_fishing_techniques FROM PUBLIC;
REVOKE ALL ON TABLE user_availability FROM PUBLIC;
REVOKE ALL ON TABLE user_roles FROM PUBLIC;
REVOKE ALL ON TABLE fishing_trips FROM PUBLIC;
REVOKE ALL ON TABLE trip_private_details FROM PUBLIC;
REVOKE ALL ON TABLE trip_participants FROM PUBLIC;
REVOKE ALL ON TABLE trip_feedback FROM PUBLIC;
REVOKE ALL ON TABLE app_events FROM PUBLIC;
REVOKE ALL ON TABLE notifications FROM PUBLIC;
REVOKE ALL ON TABLE admin_actions FROM PUBLIC;
REVOKE ALL ON TABLE public_fishing_trips FROM PUBLIC;
REVOKE ALL ON TABLE beta_trip_outcome_evidence FROM PUBLIC;
REVOKE ALL ON TABLE beta_real_fishing_trips FROM PUBLIC;
REVOKE ALL ON TABLE beta_metrics FROM PUBLIC;

COMMIT;
