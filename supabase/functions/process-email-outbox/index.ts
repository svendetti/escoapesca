import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { buildEmailContent } from "./email-content.js";

type Delivery = {
  delivery_id: string;
  event_type: string;
  recipient_user_id: string;
  trip_id: string | null;
  trip_title: string | null;
  actor_name: string | null;
  attempt_count: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function sendWithResend(
  delivery: Delivery,
  recipientEmail: string,
  from: string,
  apiKey: string,
  endpoint: string,
  appBaseUrl: string,
) {
  const content = buildEmailContent(delivery, appBaseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": delivery.delivery_id,
    },
    body: JSON.stringify({
      from,
      to: [recipientEmail],
      subject: content.subject,
      html: content.html,
      text: content.text,
    }),
  });

  const responseText = await response.text();
  let responseBody: { id?: string; message?: string } = {};
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseBody = {};
  }

  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${responseBody.message ?? responseText.slice(0, 500)}`);
  }

  if (!responseBody.id) throw new Error("Resend non ha restituito l’id del messaggio");
  return responseBody.id;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const provider = Deno.env.get("EMAIL_PROVIDER")?.trim().toLowerCase();
  const providerApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM");
  const providerEndpoint = Deno.env.get("RESEND_API_URL") ?? "https://api.resend.com/emails";
  const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://app.escoapesca.it";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase service configuration missing");
    return jsonResponse({ error: "service_configuration_missing" }, 503);
  }

  if (provider !== "resend" || !providerApiKey || !emailFrom) {
    console.error("Email provider configuration missing", {
      provider: provider ?? null,
      hasApiKey: Boolean(providerApiKey),
      hasFrom: Boolean(emailFrom),
    });
    return jsonResponse({ error: "email_provider_not_configured" }, 503);
  }

  let body: { batch_size?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const batchSize = Math.min(Math.max(Math.trunc(Number(body.batch_size) || 10), 1), 25);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("claim_email_deliveries", {
    p_limit: batchSize,
  });
  if (error) {
    console.error("Unable to claim email deliveries", { message: error.message });
    return jsonResponse({ error: "claim_failed" }, 500);
  }

  const deliveries = (data ?? []) as Delivery[];
  const results: Array<{ delivery_id: string; status: "sent" | "retry" }> = [];

  for (const delivery of deliveries) {
    try {
      const { data: userData, error: userError } = await supabase.auth.admin
        .getUserById(delivery.recipient_user_id);
      if (userError) throw new Error(`Auth lookup failed: ${userError.message}`);
      if (!userData.user?.email || !userData.user.email_confirmed_at) {
        throw new Error("Recipient email missing or not confirmed");
      }

      const providerMessageId = await sendWithResend(
        delivery,
        userData.user.email,
        emailFrom,
        providerApiKey,
        providerEndpoint,
        appBaseUrl,
      );

      const { error: completionError } = await supabase.rpc("complete_email_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_success: true,
        p_provider_message_id: providerMessageId,
        p_error: null,
      });
      if (completionError) throw new Error(`Completion failed: ${completionError.message}`);
      results.push({ delivery_id: delivery.delivery_id, status: "sent" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unknown email delivery error";
      console.error("Email delivery failed", {
        deliveryId: delivery.delivery_id,
        eventType: delivery.event_type,
        attempt: delivery.attempt_count,
        message,
      });
      const { error: completionError } = await supabase.rpc("complete_email_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_success: false,
        p_provider_message_id: null,
        p_error: message,
      });
      if (completionError) {
        console.error("Unable to record email delivery failure", {
          deliveryId: delivery.delivery_id,
          message: completionError.message,
        });
      }
      results.push({ delivery_id: delivery.delivery_id, status: "retry" });
    }
  }

  return jsonResponse({ claimed: deliveries.length, results });
});
