BEGIN;

DO $$
DECLARE
  request_definition text;
  request_result text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trip_participants'
      AND column_name = 'request_message'
      AND data_type = 'text'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'optional request_message column is missing';
  END IF;

  IF to_regprocedure('public.request_trip_participation(uuid,text)') IS NULL
    OR to_regprocedure('public.request_trip_participation(uuid)') IS NOT NULL
  THEN
    RAISE EXCEPTION 'request_trip_participation signature is not updated';
  END IF;

  IF NOT has_function_privilege(
    'authenticated', 'public.request_trip_participation(uuid,text)', 'EXECUTE'
  ) OR has_function_privilege(
    'anon', 'public.request_trip_participation(uuid,text)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'request message RPC privileges are unsafe';
  END IF;

  SELECT pg_get_functiondef('public.request_trip_participation(uuid,text)'::regprocedure)
  INTO request_definition;

  IF request_definition NOT ILIKE '%nullif(btrim%'
    OR request_definition NOT ILIKE '%char_length(normalized_request_message) > 300%'
    OR request_definition NOT ILIKE '%request_message = normalized_request_message%'
    OR request_definition NOT ILIKE '%status = ''cancelled''%'
  THEN
    RAISE EXCEPTION 'request message normalization, limit or resend semantics are incomplete';
  END IF;

  SELECT pg_get_function_result('public.list_trip_participation_requests(uuid)'::regprocedure)
  INTO request_result;

  IF request_result NOT ILIKE '%request_message text%' THEN
    RAISE EXCEPTION 'organizer request DTO does not include request_message';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.trip_participants'::regclass
      AND conname = 'trip_participants_request_message_check'
      AND pg_get_constraintdef(oid) ILIKE '%300%'
  ) THEN
    RAISE EXCEPTION 'database request_message constraint is missing';
  END IF;
END;
$$;

ROLLBACK;
