BEGIN;

ALTER TABLE public.admin_actions
DROP CONSTRAINT admin_actions_target_check;

ALTER TABLE public.admin_actions
ADD CONSTRAINT admin_actions_target_check
CHECK (
  target_user_id IS NOT NULL
  OR target_trip_id IS NOT NULL
  OR action_type IN (
    'user_disabled',
    'user_reenabled',
    'user_deleted',
    'trip_moderated_cancelled'
  )
);

COMMENT ON CONSTRAINT admin_actions_target_check
ON public.admin_actions
IS 'Conserva l’audit privo di PII anche quando il target viene eliminato.';

CREATE OR REPLACE FUNCTION public.admin_delete_disabled_user(
  p_actor_user_id uuid,
  p_user_id uuid,
  p_reason text,
  p_confirmation text
)
RETURNS TABLE (
  deleted_user_id uuid,
  deleted_trip_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_reason text := trim(COALESCE(p_reason, ''));
  normalized_confirmation text := upper(trim(COALESCE(p_confirmation, '')));
  target_status text;
BEGIN
  IF normalized_confirmation <> 'ELIMINA UTENTE' THEN
    RAISE EXCEPTION 'Conferma eliminazione non valida' USING ERRCODE = '22023';
  END IF;

  IF char_length(normalized_reason) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'La motivazione deve contenere da 3 a 1000 caratteri'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.app_users AS actor
    JOIN public.user_roles AS actor_role ON actor_role.user_id = actor.id
    WHERE actor.id = p_actor_user_id
      AND actor.status = 'active'
      AND actor_role.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso riservato agli amministratori'
      USING ERRCODE = '42501';
  END IF;

  IF p_actor_user_id = p_user_id THEN
    RAISE EXCEPTION 'Non puoi eliminare il tuo account amministratore'
      USING ERRCODE = '42501';
  END IF;

  SELECT app_user.status
  INTO target_status
  FROM public.app_users AS app_user
  WHERE app_user.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utente non trovato' USING ERRCODE = 'P0002';
  END IF;

  IF target_status <> 'disabled' THEN
    RAISE EXCEPTION 'Puoi eliminare soltanto un utente disattivato'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles AS target_role
    WHERE target_role.user_id = p_user_id
      AND target_role.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Un account amministratore non può essere eliminato'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.admin_actions AS previous_action
    WHERE previous_action.actor_user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'L’account ha uno storico amministrativo che deve essere preservato'
      USING ERRCODE = '23503';
  END IF;

  SELECT count(*)::integer
  INTO deleted_trip_count
  FROM public.fishing_trips AS trip
  WHERE trip.organizer_user_id = p_user_id;

  INSERT INTO public.admin_actions (
    actor_user_id,
    action_type,
    target_user_id,
    reason
  )
  VALUES (
    p_actor_user_id,
    'user_deleted',
    p_user_id,
    normalized_reason
  );

  DELETE FROM public.fishing_trips AS trip
  WHERE trip.organizer_user_id = p_user_id;

  DELETE FROM auth.users AS auth_user
  WHERE auth_user.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Identità Auth non trovata' USING ERRCODE = 'P0002';
  END IF;

  deleted_user_id := p_user_id;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.admin_delete_disabled_user(uuid, uuid, text, text)
IS 'Eliminazione definitiva server-side: solo service_role, attore Admin attivo e target già disattivato.';

REVOKE ALL ON FUNCTION public.admin_delete_disabled_user(uuid, uuid, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_disabled_user(uuid, uuid, text, text)
TO service_role;

COMMIT;
