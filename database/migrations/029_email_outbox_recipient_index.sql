BEGIN;

CREATE INDEX email_outbox_recipient_user_idx
ON public.email_outbox (recipient_user_id);

COMMIT;
