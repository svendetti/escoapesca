BEGIN;

GRANT EXECUTE ON FUNCTION private.is_active_trip_organizer(uuid)
TO authenticated;

COMMIT;
