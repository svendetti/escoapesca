BEGIN;

CREATE OR REPLACE FUNCTION ensure_municipality_matches_province()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.municipality_code IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM municipalities AS municipality
       WHERE municipality.code = NEW.municipality_code
         AND municipality.province_code = NEW.province_code
     ) THEN
    RAISE EXCEPTION 'Il comune % non appartiene alla provincia %',
      NEW.municipality_code,
      NEW.province_code
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER fisher_profiles_municipality_province_check
BEFORE INSERT OR UPDATE OF municipality_code, province_code ON fisher_profiles
FOR EACH ROW EXECUTE FUNCTION ensure_municipality_matches_province();

CREATE TRIGGER fishing_trips_municipality_province_check
BEFORE INSERT OR UPDATE OF municipality_code, province_code ON fishing_trips
FOR EACH ROW EXECUTE FUNCTION ensure_municipality_matches_province();

CREATE OR REPLACE FUNCTION prevent_organizer_participation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM fishing_trips AS trip
    WHERE trip.id = NEW.trip_id
      AND trip.organizer_user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'L''organizzatore non può partecipare alla propria uscita'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_participants_not_organizer
BEFORE INSERT OR UPDATE OF trip_id, user_id ON trip_participants
FOR EACH ROW EXECUTE FUNCTION prevent_organizer_participation();

CREATE OR REPLACE VIEW beta_trip_outcome_evidence
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
          AND participant.status IN ('accepted', 'confirmed', 'completed')
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
          AND participant.status IN ('accepted', 'confirmed', 'completed')
      )
    ),
    false
  ) AS participant_met_new_fisher,
  count(feedback.id) FILTER (WHERE feedback.trip_happened) AS positive_feedback_count
FROM fishing_trips AS trip
LEFT JOIN trip_feedback AS feedback ON feedback.trip_id = trip.id
GROUP BY trip.id;

COMMIT;
