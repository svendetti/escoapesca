BEGIN;

CREATE OR REPLACE VIEW public.beta_metrics
WITH (security_barrier = true, security_invoker = true)
AS
WITH eligible_users AS (
  SELECT app_user.id, app_user.status, app_user.created_at
  FROM public.app_users AS app_user
  WHERE NOT app_user.is_test
),
eligible_trips AS (
  SELECT trip.*
  FROM public.fishing_trips AS trip
  JOIN eligible_users AS organizer ON organizer.id = trip.organizer_user_id
),
eligible_participations AS (
  SELECT participant.*
  FROM public.trip_participants AS participant
  JOIN eligible_users AS app_user ON app_user.id = participant.user_id
  JOIN eligible_trips AS trip ON trip.id = participant.trip_id
),
eligible_real_trips AS (
  SELECT real_trip.trip_id
  FROM public.beta_real_fishing_trips AS real_trip
  JOIN eligible_trips AS trip ON trip.id = real_trip.trip_id
),
eligible_reported_trips AS (
  SELECT evidence.trip_id
  FROM public.beta_trip_outcome_evidence AS evidence
  JOIN eligible_trips AS trip ON trip.id = evidence.trip_id
  WHERE evidence.organizer_reported_happened
     OR evidence.participant_reported_happened
),
accepted_users AS (
  SELECT DISTINCT participant.user_id
  FROM public.trip_participants AS participant
  JOIN eligible_users AS app_user ON app_user.id = participant.user_id
  WHERE participant.accepted_at IS NOT NULL
),
repeat_users AS (
  SELECT feedback.author_user_id
  FROM public.trip_feedback AS feedback
  JOIN eligible_real_trips AS real_trip ON real_trip.trip_id = feedback.trip_id
  JOIN eligible_users AS app_user ON app_user.id = feedback.author_user_id
  WHERE feedback.trip_happened
  GROUP BY feedback.author_user_id
  HAVING count(DISTINCT feedback.trip_id) >= 2
),
eligible_feedback AS (
  SELECT feedback.*
  FROM public.trip_feedback AS feedback
  JOIN eligible_trips AS trip ON trip.id = feedback.trip_id
  JOIN eligible_users AS app_user ON app_user.id = feedback.author_user_id
),
expected_feedback AS (
  SELECT trip.id AS trip_id, trip.organizer_user_id AS author_user_id
  FROM eligible_trips AS trip
  WHERE trip.status IN ('confirmed', 'completed')
    AND trip.ends_at <= now()

  UNION

  SELECT trip.id, participant.user_id
  FROM eligible_trips AS trip
  JOIN eligible_participations AS participant ON participant.trip_id = trip.id
  WHERE trip.status IN ('confirmed', 'completed')
    AND trip.ends_at <= now()
    AND participant.status IN ('confirmed', 'completed')
),
trip_reservations AS (
  SELECT
    participant.trip_id,
    count(*) FILTER (
      WHERE participant.status IN ('accepted', 'confirmed', 'completed')
    ) AS reserved_places
  FROM eligible_participations AS participant
  GROUP BY participant.trip_id
),
totals AS (
  SELECT
    (SELECT count(*) FROM eligible_users) AS registered_users,
    (
      SELECT count(*)
      FROM public.fisher_profiles AS profile
      JOIN eligible_users AS app_user ON app_user.id = profile.user_id
      WHERE profile.completed_at IS NOT NULL
    ) AS completed_profiles,
    (SELECT count(*) FROM eligible_trips) AS created_trips,
    (
      SELECT count(*)
      FROM public.trip_participants AS participant
      JOIN eligible_users AS app_user ON app_user.id = participant.user_id
    ) AS participation_requests,
    (
      SELECT count(*)
      FROM public.trip_participants AS participant
      JOIN eligible_users AS app_user ON app_user.id = participant.user_id
      WHERE participant.accepted_at IS NOT NULL
    ) AS accepted_requests,
    (
      SELECT count(*)
      FROM eligible_trips AS trip
      WHERE trip.confirmed_at IS NOT NULL
    ) AS confirmed_trips,
    (SELECT count(*) FROM eligible_reported_trips) AS reported_trips,
    (SELECT count(*) FROM eligible_real_trips) AS real_trips,
    (SELECT count(*) FROM repeat_users) AS repeat_participants,
    (SELECT count(*) FROM accepted_users) AS users_with_accepted_participation
),
operations AS (
  SELECT
    (SELECT count(*) FROM eligible_users WHERE status = 'active') AS active_users,
    (SELECT count(*) FROM eligible_users WHERE status = 'disabled') AS disabled_users,
    (
      SELECT count(*) FROM eligible_users
      WHERE created_at >= now() - interval '7 days'
    ) AS new_users_7_days,
    (
      SELECT count(*) FROM eligible_users
      WHERE created_at >= now() - interval '30 days'
    ) AS new_users_30_days,
    (
      SELECT count(*) FROM eligible_trips
      WHERE status IN ('open', 'confirmed') AND ends_at > now()
    ) AS active_trips,
    (SELECT count(*) FROM eligible_trips WHERE status = 'open') AS open_trips,
    (
      SELECT count(*) FROM eligible_trips WHERE status = 'confirmed'
    ) AS confirmed_status_trips,
    (SELECT count(*) FROM eligible_trips WHERE status = 'completed') AS completed_trips,
    (SELECT count(*) FROM eligible_trips WHERE status = 'cancelled') AS cancelled_trips,
    (
      SELECT count(*) FROM eligible_trips
      WHERE status IN ('open', 'confirmed') AND ends_at <= now()
    ) AS overdue_trips,
    (
      SELECT count(*)
      FROM eligible_trips AS trip
      WHERE trip.status = 'open'
        AND trip.ends_at > now()
        AND NOT EXISTS (
          SELECT 1
          FROM public.trip_participants AS participant
          WHERE participant.trip_id = trip.id
        )
    ) AS open_trips_without_requests,
    (
      SELECT count(*) FROM eligible_participations WHERE status = 'requested'
    ) AS pending_requests,
    (
      SELECT count(*) FROM eligible_participations WHERE status = 'rejected'
    ) AS rejected_requests,
    (
      SELECT count(*) FROM eligible_participations WHERE status = 'cancelled'
    ) AS cancelled_requests,
    (
      SELECT COALESCE(sum(
        GREATEST(trip.max_participants - 1 - COALESCE(reservation.reserved_places, 0), 0)
      ), 0)
      FROM eligible_trips AS trip
      LEFT JOIN trip_reservations AS reservation ON reservation.trip_id = trip.id
      WHERE trip.status = 'open' AND trip.ends_at > now()
    ) AS available_places,
    (SELECT count(*) FROM eligible_feedback) AS feedback_received,
    (
      SELECT count(*)
      FROM expected_feedback AS expected
      LEFT JOIN eligible_feedback AS feedback
        ON feedback.trip_id = expected.trip_id
       AND feedback.author_user_id = expected.author_user_id
      WHERE feedback.id IS NULL
    ) AS missing_feedback,
    (SELECT round(avg(rating)::numeric, 2) FROM eligible_feedback) AS average_rating,
    (
      SELECT round(
        count(*) FILTER (WHERE would_repeat)::numeric
          / NULLIF(count(*) FILTER (WHERE trip_happened), 0),
        4
      )
      FROM eligible_feedback
    ) AS would_repeat_ratio,
    (
      SELECT count(*)
      FROM expected_feedback AS expected
      JOIN eligible_feedback AS feedback
        ON feedback.trip_id = expected.trip_id
       AND feedback.author_user_id = expected.author_user_id
    ) AS expected_feedback_received,
    (SELECT count(*) FROM expected_feedback) AS expected_feedback_total,
    (SELECT count(*) FROM eligible_participations) AS eligible_request_total
)
SELECT
  totals.registered_users,
  totals.completed_profiles,
  totals.created_trips,
  totals.participation_requests,
  totals.accepted_requests,
  totals.confirmed_trips,
  totals.reported_trips,
  totals.real_trips,
  totals.repeat_participants,
  totals.users_with_accepted_participation,
  round(
    totals.users_with_accepted_participation::numeric
      / NULLIF(totals.registered_users, 0),
    4
  ) AS registered_to_participation_ratio,
  round(
    totals.real_trips::numeric / NULLIF(totals.created_trips, 0),
    4
  ) AS created_to_real_trip_ratio,
  operations.active_users,
  operations.disabled_users,
  operations.new_users_7_days,
  operations.new_users_30_days,
  operations.active_trips,
  operations.open_trips,
  operations.confirmed_status_trips,
  operations.completed_trips,
  operations.cancelled_trips,
  operations.overdue_trips,
  operations.open_trips_without_requests,
  operations.pending_requests,
  operations.rejected_requests,
  operations.cancelled_requests,
  operations.available_places,
  operations.feedback_received,
  operations.missing_feedback,
  operations.average_rating,
  operations.would_repeat_ratio,
  round(
    totals.completed_profiles::numeric / NULLIF(totals.registered_users, 0),
    4
  ) AS profile_completion_ratio,
  round(
    totals.accepted_requests::numeric / NULLIF(totals.participation_requests, 0),
    4
  ) AS request_acceptance_ratio,
  round(
    totals.real_trips::numeric / NULLIF(totals.confirmed_trips, 0),
    4
  ) AS confirmed_to_real_trip_ratio,
  round(
    operations.expected_feedback_received::numeric
      / NULLIF(operations.expected_feedback_total, 0),
    4
  ) AS feedback_completion_ratio,
  round(
    operations.eligible_request_total::numeric / NULLIF(totals.created_trips, 0),
    2
  ) AS average_requests_per_trip
FROM totals
CROSS JOIN operations;

REVOKE ALL ON TABLE public.beta_metrics FROM PUBLIC, anon, authenticated;

COMMIT;
