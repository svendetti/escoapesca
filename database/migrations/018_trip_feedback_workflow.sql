BEGIN;

CREATE OR REPLACE FUNCTION public.list_my_trip_feedback()
RETURNS TABLE (
  feedback_id uuid,
  trip_id uuid,
  trip_happened boolean,
  met_new_fisher boolean,
  would_repeat boolean,
  rating smallint,
  comment text,
  submitted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.app_users AS viewer
    WHERE viewer.id = authenticated_user_id
      AND viewer.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    feedback.id,
    feedback.trip_id,
    feedback.trip_happened,
    feedback.met_new_fisher,
    feedback.would_repeat,
    feedback.rating,
    feedback.comment,
    feedback.submitted_at
  FROM public.trip_feedback AS feedback
  WHERE feedback.author_user_id = authenticated_user_id
  ORDER BY feedback.submitted_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_my_trip_feedback()
IS 'Restituisce esclusivamente i feedback inviati dall’utente autenticato; non crea recensioni pubbliche.';

CREATE OR REPLACE FUNCTION public.submit_trip_feedback(
  p_trip_id uuid,
  p_trip_happened boolean,
  p_met_new_fisher boolean,
  p_would_repeat boolean,
  p_rating smallint,
  p_comment text DEFAULT NULL
)
RETURNS TABLE (
  feedback_id uuid,
  trip_id uuid,
  trip_happened boolean,
  met_new_fisher boolean,
  would_repeat boolean,
  rating smallint,
  comment text,
  submitted_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  target_trip public.fishing_trips%ROWTYPE;
  normalized_comment text := NULLIF(btrim(p_comment), '');
  inserted_feedback public.trip_feedback%ROWTYPE;
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.app_users AS viewer
    WHERE viewer.id = authenticated_user_id
      AND viewer.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato' USING ERRCODE = '42501';
  END IF;

  IF p_trip_id IS NULL
    OR p_trip_happened IS NULL
    OR p_met_new_fisher IS NULL
    OR p_would_repeat IS NULL
    OR p_rating IS NULL
  THEN
    RAISE EXCEPTION 'Completa tutte le risposte obbligatorie' USING ERRCODE = '22023';
  END IF;

  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'La valutazione deve essere compresa tra 1 e 5' USING ERRCODE = '22023';
  END IF;

  IF char_length(COALESCE(normalized_comment, '')) > 1000 THEN
    RAISE EXCEPTION 'Il commento non può superare 1000 caratteri' USING ERRCODE = '22023';
  END IF;

  IF NOT p_trip_happened AND (p_met_new_fisher OR p_would_repeat) THEN
    RAISE EXCEPTION 'Se l’uscita non si è svolta, le risposte successive devono essere No' USING ERRCODE = '22023';
  END IF;

  SELECT trip.*
  INTO target_trip
  FROM public.fishing_trips AS trip
  WHERE trip.id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Uscita non trovata' USING ERRCODE = 'P0002';
  END IF;

  IF target_trip.status NOT IN ('confirmed', 'completed') THEN
    RAISE EXCEPTION 'Il feedback è disponibile solo per un’uscita confermata' USING ERRCODE = '22023';
  END IF;

  IF target_trip.ends_at > now() THEN
    RAISE EXCEPTION 'Il feedback sarà disponibile al termine dell’uscita' USING ERRCODE = '22023';
  END IF;

  IF target_trip.organizer_user_id <> authenticated_user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.trip_participants AS participant
      WHERE participant.trip_id = target_trip.id
        AND participant.user_id = authenticated_user_id
        AND participant.status IN ('confirmed', 'completed')
    )
  THEN
    RAISE EXCEPTION 'Non sei autorizzato a lasciare un feedback per questa uscita'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.trip_feedback (
    trip_id,
    author_user_id,
    trip_happened,
    met_new_fisher,
    would_repeat,
    rating,
    comment
  )
  VALUES (
    target_trip.id,
    authenticated_user_id,
    p_trip_happened,
    p_met_new_fisher,
    p_would_repeat,
    p_rating,
    normalized_comment
  )
  ON CONFLICT (trip_id, author_user_id) DO NOTHING
  RETURNING * INTO inserted_feedback;

  IF inserted_feedback.id IS NULL THEN
    RAISE EXCEPTION 'Hai già inviato il feedback per questa uscita' USING ERRCODE = '23505';
  END IF;

  IF target_trip.organizer_user_id = authenticated_user_id
    AND p_trip_happened
    AND target_trip.status = 'confirmed'
  THEN
    UPDATE public.fishing_trips
    SET
      status = 'completed',
      completed_at = COALESCE(completed_at, now()),
      version = version + 1
    WHERE id = target_trip.id;
  END IF;

  INSERT INTO public.app_events (
    event_type,
    actor_user_id,
    trip_id,
    payload
  )
  VALUES (
    'trip_feedback_submitted',
    authenticated_user_id,
    target_trip.id,
    jsonb_build_object(
      'trip_happened', p_trip_happened,
      'met_new_fisher', p_met_new_fisher,
      'would_repeat', p_would_repeat,
      'rating', p_rating
    )
  );

  RETURN QUERY
  SELECT
    inserted_feedback.id,
    inserted_feedback.trip_id,
    inserted_feedback.trip_happened,
    inserted_feedback.met_new_fisher,
    inserted_feedback.would_repeat,
    inserted_feedback.rating,
    inserted_feedback.comment,
    inserted_feedback.submitted_at;
END;
$$;

COMMENT ON FUNCTION public.submit_trip_feedback(uuid, boolean, boolean, boolean, smallint, text)
IS 'Registra una sola volta il feedback privato di organizzatore o partecipante confermato dopo la fine dell’uscita.';

REVOKE ALL ON FUNCTION public.list_my_trip_feedback()
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.submit_trip_feedback(uuid, boolean, boolean, boolean, smallint, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_my_trip_feedback()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_trip_feedback(uuid, boolean, boolean, boolean, smallint, text)
TO authenticated;

COMMIT;
