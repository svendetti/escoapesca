BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = ''fishing_trips_cancellation_details_consistency''
      AND conrelid = ''public.fishing_trips''::regclass
  ) THEN
    ALTER TABLE public.fishing_trips
    ADD CONSTRAINT fishing_trips_cancellation_details_consistency
    CHECK (
      (
        status = ''cancelled''
        AND cancelled_at IS NOT NULL
        AND (
          cancellation_reason IS NULL
          OR char_length(cancellation_reason) BETWEEN 1 AND 500
        )
      )
      OR
      (
        status <> ''cancelled''
        AND cancelled_at IS NULL
        AND cancellation_reason IS NULL
      )
    );
  END IF;
END;
$$;

CREATE POLICY fishing_trips_select_own
ON public.fishing_trips
FOR SELECT
TO authenticated
USING (
  organizer_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.app_users AS app_user
    WHERE app_user.id = (SELECT auth.uid())
      AND app_user.status = ''active''
  )
);

CREATE POLICY fishing_trips_update_own_future_open
ON public.fishing_trips
FOR UPDATE
TO authenticated
USING (
  organizer_user_id = (SELECT auth.uid())
  AND status = ''open''
  AND starts_at > now()
  AND EXISTS (
    SELECT 1
    FROM public.app_users AS app_user
    WHERE app_user.id = (SELECT auth.uid())
      AND app_user.status = ''active''
  )
)
WITH CHECK (
  organizer_user_id = (SELECT auth.uid())
  AND status IN (''open'', ''cancelled'')
  AND starts_at > now()
  AND municipality_code IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.app_users AS app_user
    WHERE app_user.id = (SELECT auth.uid())
      AND app_user.status = ''active''
  )
  AND EXISTS (
    SELECT 1
    FROM public.fishing_techniques AS technique
    WHERE technique.id = fishing_trips.technique_id
      AND technique.active
  )
  AND EXISTS (
    SELECT 1
    FROM public.provinces AS province
    WHERE province.code = fishing_trips.province_code
      AND province.region_code = ''LAZ''
      AND province.active
  )
);

GRANT SELECT ON public.fishing_trips TO authenticated;

GRANT UPDATE (
  title,
  technique_id,
  water_type,
  starts_at,
  ends_at,
  province_code,
  public_zone,
  public_meeting_point,
  max_participants,
  recommended_level,
  description,
  gear_notes,
  trip_type,
  status,
  cancelled_at,
  cancellation_reason
) ON public.fishing_trips TO authenticated;

COMMIT;
