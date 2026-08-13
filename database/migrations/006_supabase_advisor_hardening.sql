BEGIN;

-- Correzioni emerse dagli advisor Supabase sul database reale.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = public.current_app_user_id()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION ensure_municipality_matches_province()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.municipality_code IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.municipalities AS municipality
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

CREATE OR REPLACE FUNCTION prevent_organizer_participation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.fishing_trips AS trip
    WHERE trip.id = NEW.trip_id
      AND trip.organizer_user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'L''organizzatore non può partecipare alla propria uscita'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE INDEX fishing_trips_province_idx
  ON fishing_trips (province_code);

REVOKE ALL ON FUNCTION set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION current_user_is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION ensure_municipality_matches_province() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION prevent_organizer_participation() FROM PUBLIC, anon, authenticated;

COMMIT;
