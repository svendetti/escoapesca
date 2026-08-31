import { initializeInstallExperience } from "./installExperience";
import { ensurePushServiceWorker } from "./pushNotifications";

let startupInitialized = false;

export function initializeClientStartup() {
  if (startupInitialized || typeof window === "undefined" || typeof navigator === "undefined") return;
  startupInitialized = true;

  initializeInstallExperience();

  if (!("serviceWorker" in navigator)) return;

  const registerPushWorker = () => {
    void ensurePushServiceWorker().catch(() => undefined);
  };

  if (document.readyState === "complete") registerPushWorker();
  else window.addEventListener("load", registerPushWorker, { once: true });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "escoapesca:push-received") {
      window.dispatchEvent(new Event("escoapesca:notifications-updated"));
    }
  });
}
