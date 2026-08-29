import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { corsHeaders } from "npm:@supabase/supabase-js@2.112.3/cors";

const DELETE_CONFIRMATION = "ELIMINA UTENTE";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function errorStatus(code: string | undefined) {
  if (code === "42501") return 403;
  if (code === "22023" || code === "23503" || code === "P0002") return 409;
  return 500;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed", message: "Metodo non consentito." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Admin user deletion service configuration missing");
    return jsonResponse({
      error: "service_configuration_missing",
      message: "Servizio di eliminazione non configurato.",
    }, 503);
  }
  if (!token || token === authorization) {
    return jsonResponse({ error: "invalid_session", message: "Sessione non valida." }, 401);
  }

  let body: { userId?: unknown; reason?: unknown; confirmation?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_body", message: "Richiesta non valida." }, 400);
  }

  const targetUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const confirmation = typeof body.confirmation === "string"
    ? body.confirmation.trim().toUpperCase()
    : "";

  if (!UUID_PATTERN.test(targetUserId)) {
    return jsonResponse({ error: "invalid_user", message: "Utente non valido." }, 400);
  }
  if (reason.length < 3 || reason.length > 1000) {
    return jsonResponse({
      error: "invalid_reason",
      message: "La motivazione deve contenere da 3 a 1000 caratteri.",
    }, 400);
  }
  if (confirmation !== DELETE_CONFIRMATION) {
    return jsonResponse({
      error: "invalid_confirmation",
      message: "Conferma eliminazione non valida.",
    }, 400);
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await service.auth.getUser(token);
  const actorUserId = authData.user?.id;
  if (authError || !actorUserId) {
    return jsonResponse({ error: "invalid_session", message: "Sessione non valida." }, 401);
  }

  const [
    { data: actor, error: actorError },
    { data: actorRole, error: actorRoleError },
    { data: target, error: targetError },
    { data: targetRole, error: targetRoleError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    service.from("app_users").select("id, status").eq("id", actorUserId).maybeSingle(),
    service.from("user_roles").select("role").eq("user_id", actorUserId).eq("role", "admin").maybeSingle(),
    service.from("app_users").select("id, status").eq("id", targetUserId).maybeSingle(),
    service.from("user_roles").select("role").eq("user_id", targetUserId).eq("role", "admin").maybeSingle(),
    service.from("fisher_profiles").select("profile_photo_key").eq("user_id", targetUserId).maybeSingle(),
  ]);

  if (actorError || actorRoleError || targetError || targetRoleError || profileError) {
    console.error("Unable to validate admin user deletion");
    return jsonResponse({ error: "validation_failed", message: "Verifica utente non riuscita." }, 500);
  }
  if (actor?.status !== "active" || actorRole?.role !== "admin") {
    return jsonResponse({
      error: "admin_required",
      message: "Accesso riservato agli amministratori.",
    }, 403);
  }
  if (!target) {
    return jsonResponse({ error: "user_not_found", message: "Utente non trovato." }, 404);
  }
  if (targetUserId === actorUserId || targetRole?.role === "admin") {
    return jsonResponse({
      error: "admin_protected",
      message: "Un account amministratore non può essere eliminato.",
    }, 403);
  }
  if (target.status !== "disabled") {
    return jsonResponse({
      error: "user_not_disabled",
      message: "Puoi eliminare soltanto un utente disattivato.",
    }, 409);
  }

  const profilePhotoKey = typeof profile?.profile_photo_key === "string"
    ? profile.profile_photo_key
    : null;
  if (profilePhotoKey && !profilePhotoKey.startsWith(`${targetUserId}/`)) {
    console.error("Unexpected profile photo ownership while deleting user");
    return jsonResponse({
      error: "invalid_profile_photo",
      message: "La foto profilo non rispetta il confine dell’utente.",
    }, 409);
  }

  const photoKeys = Array.from(new Set([
    `${targetUserId}/avatar`,
    ...(profilePhotoKey ? [profilePhotoKey] : []),
  ]));
  const { error: storageError } = await service.storage
    .from("profile-photos")
    .remove(photoKeys);
  if (storageError) {
    console.error("Unable to remove profile photo before user deletion", {
      targetUserId,
      message: storageError.message,
    });
    return jsonResponse({
      error: "profile_photo_delete_failed",
      message: "Impossibile eliminare la foto profilo. Riprova.",
    }, 409);
  }

  const { data, error } = await service.rpc("admin_delete_disabled_user", {
    p_actor_user_id: actorUserId,
    p_user_id: targetUserId,
    p_reason: reason,
    p_confirmation: confirmation,
  });
  if (error) {
    console.error("Admin disabled user deletion failed", {
      targetUserId,
      code: error.code,
      message: error.message,
    });
    return jsonResponse({
      error: "user_delete_failed",
      message: error.message || "Eliminazione utente non riuscita.",
    }, errorStatus(error.code));
  }

  const result = (data ?? [])[0];
  if (!result) {
    return jsonResponse({
      error: "empty_delete_result",
      message: "Eliminazione utente non confermata.",
    }, 500);
  }

  return jsonResponse(result);
});
