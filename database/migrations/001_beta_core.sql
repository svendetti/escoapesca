BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$;

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  is_test boolean NOT NULL DEFAULT false,
  email_verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_users_auth_subject_length CHECK (char_length(auth_subject) BETWEEN 1 AND 255),
  CONSTRAINT app_users_email_shape CHECK (char_length(email) BETWEEN 3 AND 320 AND position('@' IN email) > 1),
  CONSTRAINT app_users_display_name_length CHECK (char_length(display_name) BETWEEN 2 AND 80),
  CONSTRAINT app_users_status_check CHECK (status IN ('active', 'disabled')),
  CONSTRAINT app_users_disabled_consistency CHECK (status <> 'disabled' OR disabled_at IS NOT NULL)
);

CREATE UNIQUE INDEX app_users_email_lower_unique ON app_users (lower(email));

CREATE TABLE legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  version text NOT NULL,
  content_url text NOT NULL,
  published_at timestamptz NOT NULL,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_documents_type_check CHECK (document_type IN ('privacy', 'terms')),
  CONSTRAINT legal_documents_version_unique UNIQUE (document_type, version),
  CONSTRAINT legal_documents_retired_after_publish CHECK (retired_at IS NULL OR retired_at > published_at)
);

CREATE TABLE legal_acceptances (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  legal_document_id uuid NOT NULL REFERENCES legal_documents(id) ON DELETE RESTRICT,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, legal_document_id)
);

CREATE TABLE provinces (
  code text PRIMARY KEY,
  name text NOT NULL,
  region_code text NOT NULL,
  region_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT provinces_code_length CHECK (char_length(code) BETWEEN 2 AND 3),
  CONSTRAINT provinces_name_length CHECK (char_length(name) BETWEEN 2 AND 80)
);

CREATE TABLE municipalities (
  code text PRIMARY KEY,
  province_code text NOT NULL REFERENCES provinces(code) ON DELETE RESTRICT,
  name text NOT NULL,
  centroid_lat numeric(9, 6),
  centroid_lon numeric(9, 6),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT municipalities_name_length CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT municipalities_latitude_check CHECK (centroid_lat IS NULL OR centroid_lat BETWEEN -90 AND 90),
  CONSTRAINT municipalities_longitude_check CHECK (centroid_lon IS NULL OR centroid_lon BETWEEN -180 AND 180)
);

CREATE INDEX municipalities_province_name_idx ON municipalities (province_code, name);

CREATE TABLE fishing_techniques (
  id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fishing_techniques_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT fishing_techniques_name_length CHECK (char_length(name) BETWEEN 2 AND 80)
);

CREATE TABLE availability_slots (
  id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL UNIQUE,
  category text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  CONSTRAINT availability_slots_category_check CHECK (category IN ('day', 'time')),
  CONSTRAINT availability_slots_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE fisher_profiles (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  province_code text NOT NULL REFERENCES provinces(code) ON DELETE RESTRICT,
  municipality_code text REFERENCES municipalities(code) ON DELETE SET NULL,
  municipality_name text NOT NULL,
  generic_zone text,
  age_band text NOT NULL,
  adult_confirmed boolean NOT NULL DEFAULT false,
  profile_photo_key text,
  bio text,
  water_type text NOT NULL,
  skill_level text NOT NULL,
  travel_radius_km smallint,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fisher_profiles_municipality_name_length CHECK (char_length(municipality_name) BETWEEN 1 AND 120),
  CONSTRAINT fisher_profiles_generic_zone_length CHECK (generic_zone IS NULL OR char_length(generic_zone) <= 160),
  CONSTRAINT fisher_profiles_age_band_check CHECK (age_band IN ('18_24', '25_34', '35_44', '45_54', '55_64', '65_plus')),
  CONSTRAINT fisher_profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500),
  CONSTRAINT fisher_profiles_water_type_check CHECK (water_type IN ('sea', 'freshwater', 'both')),
  CONSTRAINT fisher_profiles_skill_level_check CHECK (skill_level IN ('beginner', 'intermediate', 'expert')),
  CONSTRAINT fisher_profiles_travel_radius_check CHECK (travel_radius_km IS NULL OR travel_radius_km IN (10, 25, 50, 100)),
  CONSTRAINT fisher_profiles_completion_requires_adult CHECK (completed_at IS NULL OR adult_confirmed)
);

COMMENT ON COLUMN fisher_profiles.travel_radius_km IS 'NULL significa nessun limite specifico dichiarato.';

CREATE TABLE user_fishing_techniques (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  technique_id smallint NOT NULL REFERENCES fishing_techniques(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, technique_id)
);

CREATE TABLE user_availability (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  availability_slot_id smallint NOT NULL REFERENCES availability_slots(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, availability_slot_id)
);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role),
  CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'moderator'))
);

CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = current_app_user_id()
      AND role = 'admin'
  );
$$;

CREATE TABLE fishing_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  technique_id smallint NOT NULL REFERENCES fishing_techniques(id) ON DELETE RESTRICT,
  water_type text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  province_code text NOT NULL REFERENCES provinces(code) ON DELETE RESTRICT,
  municipality_code text REFERENCES municipalities(code) ON DELETE SET NULL,
  public_zone text NOT NULL,
  public_meeting_point text,
  max_participants smallint NOT NULL,
  recommended_level text NOT NULL DEFAULT 'any',
  description text NOT NULL,
  gear_notes text,
  trip_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fishing_trips_title_length CHECK (char_length(title) BETWEEN 4 AND 120),
  CONSTRAINT fishing_trips_water_type_check CHECK (water_type IN ('sea', 'freshwater')),
  CONSTRAINT fishing_trips_time_order CHECK (ends_at > starts_at),
  CONSTRAINT fishing_trips_public_zone_length CHECK (char_length(public_zone) BETWEEN 2 AND 160),
  CONSTRAINT fishing_trips_public_meeting_length CHECK (public_meeting_point IS NULL OR char_length(public_meeting_point) <= 240),
  CONSTRAINT fishing_trips_protected_public_meeting_check CHECK (trip_type = 'free' OR public_meeting_point IS NULL),
  CONSTRAINT fishing_trips_max_participants_check CHECK (max_participants BETWEEN 2 AND 20),
  CONSTRAINT fishing_trips_level_check CHECK (recommended_level IN ('any', 'beginner', 'intermediate', 'expert')),
  CONSTRAINT fishing_trips_description_length CHECK (char_length(description) BETWEEN 1 AND 2000),
  CONSTRAINT fishing_trips_gear_notes_length CHECK (gear_notes IS NULL OR char_length(gear_notes) <= 1000),
  CONSTRAINT fishing_trips_type_check CHECK (trip_type IN ('free', 'protected')),
  CONSTRAINT fishing_trips_status_check CHECK (status IN ('draft', 'open', 'confirmed', 'completed', 'cancelled')),
  CONSTRAINT fishing_trips_confirmed_consistency CHECK (status NOT IN ('confirmed', 'completed') OR confirmed_at IS NOT NULL),
  CONSTRAINT fishing_trips_completed_consistency CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CONSTRAINT fishing_trips_cancelled_consistency CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL),
  CONSTRAINT fishing_trips_version_positive CHECK (version > 0)
);

COMMENT ON COLUMN fishing_trips.max_participants IS 'Numero massimo totale, organizzatore incluso.';

CREATE INDEX fishing_trips_discovery_idx ON fishing_trips (status, starts_at, province_code);
CREATE INDEX fishing_trips_filter_idx ON fishing_trips (technique_id, water_type, starts_at);
CREATE INDEX fishing_trips_organizer_idx ON fishing_trips (organizer_user_id, starts_at DESC);

CREATE TABLE trip_private_details (
  trip_id uuid PRIMARY KEY REFERENCES fishing_trips(id) ON DELETE CASCADE,
  meeting_point_text text,
  exact_lat numeric(9, 6),
  exact_lon numeric(9, 6),
  private_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_private_details_meeting_length CHECK (meeting_point_text IS NULL OR char_length(meeting_point_text) <= 500),
  CONSTRAINT trip_private_details_latitude_check CHECK (exact_lat IS NULL OR exact_lat BETWEEN -90 AND 90),
  CONSTRAINT trip_private_details_longitude_check CHECK (exact_lon IS NULL OR exact_lon BETWEEN -180 AND 180),
  CONSTRAINT trip_private_details_coordinate_pair CHECK ((exact_lat IS NULL) = (exact_lon IS NULL)),
  CONSTRAINT trip_private_details_notes_length CHECK (private_notes IS NULL OR char_length(private_notes) <= 2000)
);

CREATE TABLE trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES fishing_trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  no_show_at timestamptz,
  decided_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_participants_trip_user_unique UNIQUE (trip_id, user_id),
  CONSTRAINT trip_participants_status_check CHECK (status IN ('requested', 'accepted', 'rejected', 'cancelled', 'confirmed', 'completed', 'no_show')),
  CONSTRAINT trip_participants_accepted_consistency CHECK (status NOT IN ('accepted', 'confirmed', 'completed', 'no_show') OR accepted_at IS NOT NULL),
  CONSTRAINT trip_participants_rejected_consistency CHECK (status <> 'rejected' OR rejected_at IS NOT NULL),
  CONSTRAINT trip_participants_cancelled_consistency CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL),
  CONSTRAINT trip_participants_confirmed_consistency CHECK (status NOT IN ('confirmed', 'completed', 'no_show') OR confirmed_at IS NOT NULL),
  CONSTRAINT trip_participants_completed_consistency CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CONSTRAINT trip_participants_no_show_consistency CHECK (status <> 'no_show' OR no_show_at IS NOT NULL)
);

CREATE INDEX trip_participants_trip_status_idx ON trip_participants (trip_id, status);
CREATE INDEX trip_participants_user_status_idx ON trip_participants (user_id, status, requested_at DESC);

CREATE TABLE trip_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES fishing_trips(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  trip_happened boolean NOT NULL,
  met_new_fisher boolean NOT NULL,
  would_repeat boolean NOT NULL,
  rating smallint NOT NULL,
  comment text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_feedback_trip_author_unique UNIQUE (trip_id, author_user_id),
  CONSTRAINT trip_feedback_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT trip_feedback_comment_length CHECK (comment IS NULL OR char_length(comment) <= 1000),
  CONSTRAINT trip_feedback_met_requires_trip CHECK (NOT met_new_fisher OR trip_happened),
  CONSTRAINT trip_feedback_repeat_requires_trip CHECK (NOT would_repeat OR trip_happened)
);

CREATE INDEX trip_feedback_trip_idx ON trip_feedback (trip_id, submitted_at);

CREATE TABLE app_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES fishing_trips(id) ON DELETE SET NULL,
  participant_id uuid REFERENCES trip_participants(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_attempts smallint NOT NULL DEFAULT 0,
  CONSTRAINT app_events_type_length CHECK (char_length(event_type) BETWEEN 3 AND 100),
  CONSTRAINT app_events_attempts_nonnegative CHECK (processing_attempts >= 0)
);

CREATE INDEX app_events_type_time_idx ON app_events (event_type, occurred_at DESC);
CREATE INDEX app_events_unprocessed_idx ON app_events (occurred_at) WHERE processed_at IS NULL;

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  event_id bigint REFERENCES app_events(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES fishing_trips(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text UNIQUE,
  read_at timestamptz,
  email_status text NOT NULL DEFAULT 'pending',
  email_attempts smallint NOT NULL DEFAULT 0,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_length CHECK (char_length(notification_type) BETWEEN 3 AND 100),
  CONSTRAINT notifications_email_status_check CHECK (email_status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT notifications_email_attempts_nonnegative CHECK (email_attempts >= 0),
  CONSTRAINT notifications_email_sent_consistency CHECK (email_status <> 'sent' OR email_sent_at IS NOT NULL)
);

CREATE INDEX notifications_user_unread_idx ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX notifications_email_pending_idx ON notifications (created_at) WHERE email_status IN ('pending', 'failed');

CREATE TABLE admin_actions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  target_trip_id uuid REFERENCES fishing_trips(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_actions_type_length CHECK (char_length(action_type) BETWEEN 3 AND 100),
  CONSTRAINT admin_actions_reason_length CHECK (char_length(reason) BETWEEN 3 AND 1000),
  CONSTRAINT admin_actions_target_check CHECK (target_user_id IS NOT NULL OR target_trip_id IS NOT NULL)
);

CREATE INDEX admin_actions_created_idx ON admin_actions (created_at DESC);

COMMIT;
