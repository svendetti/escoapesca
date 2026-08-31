import { requireSupabase } from "./supabase";

export type PushState = "unsupported" | "needs-install" | "denied" | "inactive" | "active";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function supported() {
  return window.isSecureContext
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

export async function ensurePushServiceWorker() {
  return navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function saveSubscription(subscription: PushSubscription) {
  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
    throw new Error("Il browser non ha restituito una sottoscrizione push valida.");
  }
  const { error } = await requireSupabase().rpc("upsert_my_push_subscription", {
    p_endpoint: serialized.endpoint,
    p_p256dh: serialized.keys.p256dh,
    p_auth_secret: serialized.keys.auth,
    p_expiration_time: serialized.expirationTime ?? null,
  });
  if (error) throw error;
}

export async function inspectPushNotifications(sync = false): Promise<PushState> {
  if (!supported()) return "unsupported";
  if (isIos() && !isStandalone()) return "needs-install";
  if (Notification.permission === "denied") return "denied";
  const current = await (await ensurePushServiceWorker()).pushManager.getSubscription();
  if (current && sync) await saveSubscription(current);
  return current ? "active" : "inactive";
}

export async function enablePushNotifications(): Promise<PushState> {
  if (!supported()) return "unsupported";
  if (isIos() && !isStandalone()) return "needs-install";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "inactive";

  const worker = await ensurePushServiceWorker();
  let subscription = await worker.pushManager.getSubscription();
  if (!subscription) {
    const { data, error } = await requireSupabase().functions.invoke("process-push-outbox", {
      body: { action: "config" },
    });
    if (error) throw error;
    const publicKey = typeof data?.public_key === "string" ? data.public_key : "";
    if (!publicKey) throw new Error("Il servizio notifiche non è ancora configurato.");
    subscription = await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey),
    });
  }
  await saveSubscription(subscription);
  return "active";
}

export async function disablePushNotifications(): Promise<PushState> {
  if (!supported()) return "unsupported";
  const current = await (await ensurePushServiceWorker()).pushManager.getSubscription();
  if (current) {
    const { error } = await requireSupabase().rpc("remove_my_push_subscription", {
      p_endpoint: current.endpoint,
    });
    if (error) throw error;
    await current.unsubscribe();
  }
  return "inactive";
}

export async function sendTestPushNotification() {
  const { error } = await requireSupabase().rpc("send_test_push_notification");
  if (error) throw error;
}
