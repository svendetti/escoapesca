BEGIN;

CREATE TABLE public.trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.fishing_trips(id) ON DELETE CASCADE,
  inviter_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  invitee_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_invitations_distinct_users CHECK (inviter_user_id <> invitee_user_id),
  CONSTRAINT trip_invitations_trip_invitee_unique UNIQUE (trip_id, invitee_user_id)
);

CREATE INDEX trip_invitations_invitee_sent_idx
ON public.trip_invitations (invitee_user_id, sent_at DESC);

ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.trip_invitations FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.trip_invitations
IS 'Inviti a un’uscita inviati dall’organizzatore; un invito non riserva automaticamente un posto.';

CREATE FUNCTION public.list_trip_invite_candidates(
  p_trip_id uuid,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 24
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  municipality_name text,
  generic_zone text,
  skill_level text,
  water_type text,
  technique_names text[],
  already_invited boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  authenticated_user_id uuid := auth.uid();
  normalized_search text := NULLIF(btrim(COALESCE(p_search, '')), '');
  normalized_limit integer := LEAST(GREATEST(COALESCE(p_limit, 24), 1), 40);
  selected_trip public.fishing_trips%ROWTYPE;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;
  IF normalized_search IS NOT NULL AND char_length(normalized_search) > 80 THEN
    RAISE EXCEPTION 'La ricerca può contenere al massimo 80 caratteri' USING ERRCODE = '22001';
  END IF;

  SELECT trip.* INTO selected_trip
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id AND organizer.status = 'active'
  WHERE trip.id = p_trip_id
    AND trip.organizer_user_id = authenticated_user_id
    AND trip.status = 'open'
    AND trip.starts_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Uscita non trovata o non gestibile' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    app_user.id, app_user.display_name, profile.municipality_name,
    profile.generic_zone, profile.skill_level, profile.water_type,
    COALESCE(techniques.names, ARRAY[]::text[]), invitation.id IS NOT NULL
  FROM public.app_users AS app_user
  JOIN public.fisher_profiles AS profile
    ON profile.user_id = app_user.id AND profile.completed_at IS NOT NULL
  LEFT JOIN public.trip_invitations AS invitation
    ON invitation.trip_id = selected_trip.id AND invitation.invitee_user_id = app_user.id
  LEFT JOIN LATERAL (
    SELECT array_agg(technique.name ORDER BY technique.sort_order, technique.name) AS names
    FROM public.user_fishing_techniques AS selected
    JOIN public.fishing_techniques AS technique
      ON technique.id = selected.technique_id AND technique.active
    WHERE selected.user_id = app_user.id
  ) AS techniques ON true
  WHERE app_user.id <> authenticated_user_id
    AND app_user.status = 'active'
    AND NOT app_user.is_test
    AND NOT EXISTS (
      SELECT 1 FROM public.trip_participants AS participant
      WHERE participant.trip_id = selected_trip.id
        AND participant.user_id = app_user.id
        AND participant.status <> 'cancelled'
    )
    AND (
      normalized_search IS NULL
      OR app_user.display_name ILIKE '%' || normalized_search || '%'
      OR profile.municipality_name ILIKE '%' || normalized_search || '%'
      OR COALESCE(profile.generic_zone, '') ILIKE '%' || normalized_search || '%'
    )
  ORDER BY
    (invitation.id IS NOT NULL),
    (profile.province_code = selected_trip.province_code) DESC,
    (profile.water_type IN (selected_trip.water_type, 'both')) DESC,
    EXISTS (
      SELECT 1 FROM public.user_fishing_techniques AS selected
      WHERE selected.user_id = app_user.id AND selected.technique_id = selected_trip.technique_id
    ) DESC,
    app_user.display_name
  LIMIT normalized_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_trip_invite_candidates(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_trip_invite_candidates(uuid, text, integer) TO authenticated;

CREATE FUNCTION public.send_trip_invitation(p_trip_id uuid, p_invitee_user_id uuid)
RETURNS TABLE (invitation_id uuid, sent_now boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  authenticated_user_id uuid := auth.uid();
  selected_invitation_id uuid;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non valida' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.fishing_trips AS trip
    JOIN public.app_users AS organizer
      ON organizer.id = trip.organizer_user_id AND organizer.status = 'active'
    WHERE trip.id = p_trip_id
      AND trip.organizer_user_id = authenticated_user_id
      AND trip.status = 'open'
      AND trip.starts_at > now()
      AND (
        SELECT count(*) FROM public.trip_participants AS participant
        WHERE participant.trip_id = trip.id
          AND participant.status IN ('accepted', 'confirmed', 'completed', 'no_show')
      ) < trip.max_participants - 1
  ) THEN
    RAISE EXCEPTION 'Uscita non disponibile per nuovi inviti' USING ERRCODE = 'P0002';
  END IF;
  IF p_invitee_user_id = authenticated_user_id OR NOT EXISTS (
    SELECT 1 FROM public.app_users AS app_user
    JOIN public.fisher_profiles AS profile
      ON profile.user_id = app_user.id AND profile.completed_at IS NOT NULL
    WHERE app_user.id = p_invitee_user_id
      AND app_user.status = 'active'
      AND NOT app_user.is_test
  ) THEN
    RAISE EXCEPTION 'Utente non disponibile per l’invito' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.trip_participants AS participant
    WHERE participant.trip_id = p_trip_id
      AND participant.user_id = p_invitee_user_id
      AND participant.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'L’utente ha già una partecipazione per questa uscita' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.trip_invitations (trip_id, inviter_user_id, invitee_user_id)
  VALUES (p_trip_id, authenticated_user_id, p_invitee_user_id)
  ON CONFLICT (trip_id, invitee_user_id) DO NOTHING
  RETURNING id INTO selected_invitation_id;

  IF selected_invitation_id IS NULL THEN
    SELECT invitation.id INTO selected_invitation_id
    FROM public.trip_invitations AS invitation
    WHERE invitation.trip_id = p_trip_id AND invitation.invitee_user_id = p_invitee_user_id;
    RETURN QUERY SELECT selected_invitation_id, false;
    RETURN;
  END IF;

  INSERT INTO public.app_events (event_type, actor_user_id, trip_id, payload)
  VALUES (
    'trip_invitation_sent', authenticated_user_id, p_trip_id,
    jsonb_build_object('recipient_user_id', p_invitee_user_id)
  );
  RETURN QUERY SELECT selected_invitation_id, true;
END;
$function$;

REVOKE ALL ON FUNCTION public.send_trip_invitation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_trip_invitation(uuid, uuid) TO authenticated;

COMMIT;
