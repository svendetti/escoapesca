BEGIN;

CREATE OR REPLACE FUNCTION public.list_trip_group_members(p_trip_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  member_role text,
  participation_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
BEGIN
  IF authenticated_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.app_users AS caller WHERE caller.id = authenticated_user_id AND caller.status = 'active') OR NOT EXISTS (
    SELECT 1 FROM public.fishing_trips AS trip
    WHERE trip.id = p_trip_id
      AND (
        trip.organizer_user_id = authenticated_user_id
        OR EXISTS (
          SELECT 1 FROM public.trip_participants AS viewer
          WHERE viewer.trip_id = trip.id
            AND viewer.user_id = authenticated_user_id
            AND viewer.status IN ('accepted', 'confirmed', 'completed')
        )
      )
  ) THEN
    RAISE EXCEPTION 'Gruppo non accessibile' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT organizer.id, organizer.display_name, 'organizer'::text, NULL::text
  FROM public.fishing_trips AS trip
  JOIN public.app_users AS organizer
    ON organizer.id = trip.organizer_user_id
   AND organizer.status = 'active'
  WHERE trip.id = p_trip_id

  UNION ALL

  SELECT member.id, member.display_name, 'participant'::text, participant.status
  FROM public.trip_participants AS participant
  JOIN public.app_users AS member
    ON member.id = participant.user_id
   AND member.status = 'active'
  WHERE participant.trip_id = p_trip_id
    AND participant.status IN ('accepted', 'confirmed', 'completed')
  ORDER BY 3 ASC, 2;
END;
$$;

REVOKE ALL ON FUNCTION public.list_trip_group_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_trip_group_members(uuid) TO authenticated;


COMMIT;
