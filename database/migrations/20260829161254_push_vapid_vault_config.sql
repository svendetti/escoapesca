BEGIN;

CREATE FUNCTION public.get_push_worker_config()
RETURNS TABLE (public_key text, private_key text, subject text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Worker non autorizzato' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    max(secret.decrypted_secret) FILTER (WHERE secret.name = 'escoapesca_vapid_public_key'),
    max(secret.decrypted_secret) FILTER (WHERE secret.name = 'escoapesca_vapid_private_key'),
    COALESCE(
      max(secret.decrypted_secret) FILTER (WHERE secret.name = 'escoapesca_vapid_subject'),
      'mailto:privacy@escoapesca.it'
    )
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name IN (
    'escoapesca_vapid_public_key',
    'escoapesca_vapid_private_key',
    'escoapesca_vapid_subject'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_push_worker_config()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_worker_config()
TO service_role;

COMMIT;
