BEGIN;

CREATE INDEX trip_invitations_inviter_idx
ON public.trip_invitations (inviter_user_id);

CREATE INDEX push_outbox_subscription_idx
ON public.push_outbox (subscription_id);

COMMIT;
