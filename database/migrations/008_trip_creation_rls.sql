BEGIN;

CREATE POLICY fishing_trips_insert_own_completed_profile
ON public.fishing_trips
FOR INSERT
TO authenticated
WITH CHECK (
  organizer_user_id = (SELECT auth.uid())
  AND status = 'open'
  AND municipality_code IS NULL
  AND EXISTS (
    SELECT 1 FROM public.app_users AS app_user
    WHERE app_user.id = (SELECT auth.uid()) AND app_user.status = 'active'
  )
  AND EXISTS (
    SELECT 1 FROM public.fisher_profiles AS profile
    WHERE profile.user_id = (SELECT auth.uid()) AND profile.completed_at IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.fishing_techniques AS technique
    WHERE technique.id = fishing_trips.technique_id AND technique.active
  )
  AND EXISTS (
    SELECT 1 FROM public.provinces AS province
    WHERE province.code = fishing_trips.province_code
      AND province.region_code = 'LAZ'
      AND province.active
  )
);

GRANT INSERT (
  organizer_user_id,
  title,
  technique_id,
  water_type,
  starts_at,
  ends_at,
  province_code,
  municipality_code,
  public_zone,
  public_meeting_point,
  max_participants,
  recommended_level,
  description,
  gear_notes,
  trip_type,
  status
) ON public.fishing_trips TO authenticated;

COMMIT;
