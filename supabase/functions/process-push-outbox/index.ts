import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import webpush from "npm:web-push@3.6.7";
import { buildPushContent } from "./push-content.js";

type Delivery = {
  delivery_id: string;
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  notification_type: string;
  trip_id: string | null;
  trip_title: string | null;
  actor_name: string | null;
  attempt_count: number;
};

type PushConfig = { public_key: string | null; private_key: string | null; subject: string | null };

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  let body: { action?: string; batch_size?: number } = {};
  try { body = await request.json(); } catch { body = {}; }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase service configuration missing");
    return jsonResponse({ error: "service_configuration_missing" }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: configRows, error: configError } = await supabase.rpc("get_push_worker_config");
  if (configError) {
    console.error("Unable to load push configuration", { message: configError.message });
    return jsonResponse({ error: "push_configuration_unavailable" }, 503);
  }
  const config = ((configRows ?? [])[0] ?? null) as PushConfig | null;

  if (body.action === "config") {
    return config?.public_key
      ? jsonResponse({ public_key: config.public_key })
      : jsonResponse({ error: "push_not_configured" }, 503);
  }

  if (!config?.public_key || !config.private_key) {
    console.error("VAPID configuration missing");
    return jsonResponse({ error: "push_not_configured" }, 503);
  }

  webpush.setVapidDetails(
    config.subject || "mailto:privacy@escoapesca.it",
    config.public_key,
    config.private_key,
  );
  const batchSize = Math.min(Math.max(Math.trunc(Number(body.batch_size) || 20), 1), 50);
  const { data, error } = await supabase.rpc("claim_push_deliveries", { p_limit: batchSize });
  if (error) {
    console.error("Unable to claim push deliveries", { message: error.message });
    return jsonResponse({ error: "claim_failed" }, 500);
  }

  const deliveries = (data ?? []) as Delivery[];
  const results: Array<{ delivery_id: string; status: "sent" | "retry" | "failed" }> = [];
  for (const delivery of deliveries) {
    try {
      const content = buildPushContent(delivery);
      await webpush.sendNotification(
        {
          endpoint: delivery.endpoint,
          keys: { p256dh: delivery.p256dh, auth: delivery.auth_secret },
        },
        JSON.stringify(content),
        { TTL: 600, urgency: "high" },
      );
      const { error: completionError } = await supabase.rpc("complete_push_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_success: true,
        p_permanent_failure: false,
        p_error: null,
      });
      if (completionError) throw new Error(`Completion failed: ${completionError.message}`);
      results.push({ delivery_id: delivery.delivery_id, status: "sent" });
    } catch (caught) {
      const statusCode = typeof caught === "object" && caught && "statusCode" in caught
        ? Number((caught as { statusCode?: unknown }).statusCode)
        : 0;
      const permanent = statusCode === 404 || statusCode === 410;
      const message = caught instanceof Error ? caught.message : "Unknown push delivery error";
      console.error("Push delivery failed", {
        deliveryId: delivery.delivery_id,
        eventType: delivery.notification_type,
        attempt: delivery.attempt_count,
        statusCode,
        message,
      });
      const { error: completionError } = await supabase.rpc("complete_push_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_success: false,
        p_permanent_failure: permanent,
        p_error: message,
      });
      if (completionError) {
        console.error("Unable to record push failure", {
          deliveryId: delivery.delivery_id,
          message: completionError.message,
        });
      }
      results.push({ delivery_id: delivery.delivery_id, status: permanent ? "failed" : "retry" });
    }
  }

  return jsonResponse({ claimed: deliveries.length, results });
});
