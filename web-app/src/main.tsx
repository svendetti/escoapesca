import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initializeInstallExperience } from "./lib/installExperience";
import { ensurePushServiceWorker } from "./lib/pushNotifications";
import "./styles.css";
import "./label-alignment.css";

initializeInstallExperience();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void ensurePushServiceWorker().catch(() => undefined);
  });
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "escoapesca:push-received") {
      window.dispatchEvent(new Event("escoapesca:notifications-updated"));
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
