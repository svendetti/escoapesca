// Servizi Web Push dei browser supportati. Non accettare host arbitrari:
// l'endpoint proviene da input utente e viene contattato dal worker server.
// Fonti e limiti: docs/PROJECT_REVIEW_2026-11-14.md.
export class UntrustedPushEndpointError extends Error {
  constructor() {
    super("Endpoint push non supportato");
    this.name = "UntrustedPushEndpointError";
  }
}

function trustedEndpoint(endpoint) {
  if (typeof endpoint !== "string") return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return null;
    const trusted = url.hostname === "fcm.googleapis.com"
      || url.hostname === "updates.push.services.mozilla.com"
      || url.hostname.endsWith(".push.apple.com")
      || url.hostname.endsWith(".notify.windows.com");
    return trusted ? url.href : null;
  } catch {
    return null;
  }
}

export async function sendValidatedPush(delivery, content, sendNotification) {
  const endpoint = trustedEndpoint(delivery.endpoint);
  if (!endpoint) throw new UntrustedPushEndpointError();
  return sendNotification(
    {
      // Usa la stessa forma canonica verificata, non un secondo parsing dell'input.
      endpoint,
      keys: { p256dh: delivery.p256dh, auth: delivery.auth_secret },
    },
    JSON.stringify(content),
    { TTL: 600, urgency: "high", timeout: 10000 },
  );
}
