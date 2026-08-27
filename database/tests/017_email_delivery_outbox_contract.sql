BEGIN;

DO $$
DECLARE
  claim_definition text;
  complete_definition text;
  enqueue_definition text;
BEGIN
  IF to_regclass('public.email_outbox') IS NULL THEN
    RAISE EXCEPTION 'email_outbox table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.email_outbox'::regclass
      AND conname = 'email_outbox_event_recipient_channel_unique'
  ) THEN
    RAISE EXCEPTION 'event-recipient-channel idempotency constraint is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'email_outbox'
      AND indexname = 'email_outbox_recipient_user_idx'
      AND indexdef ILIKE '%(recipient_user_id)%'
  ) THEN
    RAISE EXCEPTION 'recipient foreign-key index is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_outbox'
      AND column_name IN ('email', 'recipient_email')
  ) THEN
    RAISE EXCEPTION 'email address must not be copied into email_outbox';
  END IF;

  IF has_table_privilege('authenticated', 'public.email_outbox', 'SELECT')
    OR has_table_privilege('authenticated', 'public.email_outbox', 'INSERT')
    OR has_table_privilege('anon', 'public.email_outbox', 'SELECT')
  THEN
    RAISE EXCEPTION 'email_outbox is exposed to public API roles';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class AS relation
    WHERE relation.oid = 'public.email_outbox'::regclass
      AND relation.relrowsecurity
      AND relation.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'email_outbox must force RLS';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.notifications'::regclass
      AND tgname = 'notifications_enqueue_email_delivery'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'notification-to-email delivery trigger is missing';
  END IF;

  SELECT pg_get_functiondef('private.enqueue_email_delivery_after_notification()'::regprocedure)
  INTO enqueue_definition;

  IF enqueue_definition NOT ILIKE '%participation_requested%'
    OR enqueue_definition NOT ILIKE '%trip_private_details_updated%'
    OR enqueue_definition NOT ILIKE '%ON CONFLICT%DO NOTHING%'
  THEN
    RAISE EXCEPTION 'critical event coverage or enqueue idempotency is incomplete';
  END IF;

  IF to_regprocedure('public.claim_email_deliveries(integer)') IS NULL
    OR to_regprocedure('public.complete_email_delivery(uuid,boolean,text,text)') IS NULL
  THEN
    RAISE EXCEPTION 'email worker RPCs are missing';
  END IF;

  IF has_function_privilege(
    'authenticated', 'public.claim_email_deliveries(integer)', 'EXECUTE'
  ) OR has_function_privilege(
    'anon', 'public.complete_email_delivery(uuid,boolean,text,text)', 'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role', 'public.claim_email_deliveries(integer)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'email worker RPC privileges are unsafe';
  END IF;

  SELECT pg_get_functiondef('public.claim_email_deliveries(integer)'::regprocedure)
  INTO claim_definition;
  SELECT pg_get_functiondef('public.complete_email_delivery(uuid,boolean,text,text)'::regprocedure)
  INTO complete_definition;

  IF claim_definition NOT ILIKE '%FOR UPDATE SKIP LOCKED%'
    OR claim_definition NOT ILIKE '%15 minutes%'
    OR claim_definition NOT ILIKE '%attempt_count < 5%'
  THEN
    RAISE EXCEPTION 'claim concurrency, stale recovery or retry cap is incomplete';
  END IF;

  IF complete_definition NOT ILIKE '%make_interval%power(2%'
    OR complete_definition NOT ILIKE '%attempt_count >= 5%'
    OR complete_definition NOT ILIKE '%provider_message_id%'
  THEN
    RAISE EXCEPTION 'completion backoff, terminal failure or provider logging is incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'escoapesca-process-email-outbox'
  ) THEN
    RAISE EXCEPTION 'email outbox cron worker is not scheduled';
  END IF;
END;
$$;

ROLLBACK;
