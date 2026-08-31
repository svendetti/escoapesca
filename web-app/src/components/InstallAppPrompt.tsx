import { useEffect, useMemo, useState } from "react";
import { Notice } from "./Notice";
import { readableError } from "../lib/errors";
import {
  APP_INSTALLED_EVENT,
  INSTALL_PROMPT_AVAILABLE_EVENT,
  detectMobilePlatform,
  hasInstallPrompt,
  isReminderSuppressed,
  isRunningStandalone,
  reminderSuppressionUntil,
  requestInstallPrompt,
} from "../lib/installExperience";
import {
  enablePushNotifications,
  inspectPushNotifications,
  type PushState,
} from "../lib/pushNotifications";

const INSTALL_REMINDER_KEY = "escoapesca:install-reminder-until";
const PUSH_REMINDER_KEY = "escoapesca:push-reminder-until";

function reminderIsSuppressed(key: string) {
  try {
    return isReminderSuppressed(localStorage.getItem(key));
  } catch {
    return false;
  }
}

function currentPlatform() {
  return detectMobilePlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
}

function currentStandalone() {
  return isRunningStandalone(
    window.matchMedia("(display-mode: standalone)").matches,
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  );
}

export function InstallAppPrompt() {
  const platform = useMemo(currentPlatform, []);
  const [standalone, setStandalone] = useState(currentStandalone);
  const [installReady, setInstallReady] = useState(hasInstallPrompt);
  const [manualInstall, setManualInstall] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installedNow, setInstalledNow] = useState(false);
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installSuppressed, setInstallSuppressed] = useState(() => reminderIsSuppressed(INSTALL_REMINDER_KEY));
  const [pushSuppressed, setPushSuppressed] = useState(() => reminderIsSuppressed(PUSH_REMINDER_KEY));

  useEffect(() => {
    const installAvailable = () => {
      setInstallReady(true);
      setManualInstall(false);
      setError(null);
    };
    const installed = () => {
      setInstallReady(false);
      setInstalledNow(true);
      try { localStorage.removeItem(INSTALL_REMINDER_KEY); } catch { /* Prefer the working install flow to persistence. */ }
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateDisplayMode = () => setStandalone(currentStandalone());

    window.addEventListener(INSTALL_PROMPT_AVAILABLE_EVENT, installAvailable);
    window.addEventListener(APP_INSTALLED_EVENT, installed);
    displayMode.addEventListener?.("change", updateDisplayMode);
    return () => {
      window.removeEventListener(INSTALL_PROMPT_AVAILABLE_EVENT, installAvailable);
      window.removeEventListener(APP_INSTALLED_EVENT, installed);
      displayMode.removeEventListener?.("change", updateDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (platform !== "android" || installReady) return;
    const timeout = window.setTimeout(() => {
      if (!hasInstallPrompt()) setManualInstall(true);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [installReady, platform]);

  useEffect(() => {
    if (platform === "other" || !standalone) return;
    let active = true;
    void inspectPushNotifications(true)
      .then((state) => { if (active) setPushState(state); })
      .catch((caught) => {
        if (!active) return;
        setPushState("inactive");
        setError(readableError(caught));
      });
    return () => { active = false; };
  }, [platform, standalone]);

  function postpone(key: string, update: (suppressed: boolean) => void) {
    try { localStorage.setItem(key, reminderSuppressionUntil()); } catch { /* The reminder can still close for this session. */ }
    update(true);
  }

  async function installAndroid() {
    setBusy(true);
    setError(null);
    try {
      const outcome = await requestInstallPrompt();
      if (outcome === "unavailable") {
        setInstallReady(false);
        setManualInstall(true);
      } else if (outcome === "accepted") {
        setInstalledNow(true);
        try { localStorage.removeItem(INSTALL_REMINDER_KEY); } catch { /* Installation has already succeeded. */ }
      } else {
        postpone(INSTALL_REMINDER_KEY, setInstallSuppressed);
      }
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function activatePush() {
    setBusy(true);
    setError(null);
    try {
      const state = await enablePushNotifications();
      setPushState(state);
      if (state === "denied") {
        setError("Le notifiche sono state bloccate. Puoi riattivarle dalle impostazioni del telefono.");
      }
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (platform === "other") return null;

  if (standalone) {
    if (pushSuppressed || pushState === null || pushState === "active" || pushState === "unsupported") return null;
    return (
      <section className="install-app-card push-step" aria-labelledby="push-step-title">
        <div className="install-app-copy">
          <div className="eyebrow">Ultimo passaggio</div>
          <h2 id="push-step-title">Ricevi gli avvisi importanti</h2>
          <p>Attiva le notifiche per ricevere aggiornamenti su richieste, conferme e dettagli dell’uscita anche quando EscoAPesca è chiusa.</p>
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        <div className="install-app-actions">
          {pushState === "denied" ? (
            <a className="button button-secondary" href="/notifiche">Controlla le impostazioni</a>
          ) : (
            <button className="button button-primary" disabled={busy} type="button" onClick={() => void activatePush()}>
              {busy ? "Attivazione…" : "Attiva notifiche"}
            </button>
          )}
          <button className="button button-quiet" disabled={busy} type="button" onClick={() => postpone(PUSH_REMINDER_KEY, setPushSuppressed)}>
            Non ora
          </button>
        </div>
      </section>
    );
  }

  if (installSuppressed) return null;

  return (
    <section className="install-app-card" aria-labelledby="install-app-title">
      <div className="install-app-copy">
        <div className="eyebrow">EscoAPesca sul telefono</div>
        <h2 id="install-app-title">Installa EscoAPesca</h2>
        <p>Installa EscoAPesca sul telefono e ricevi gli avvisi anche quando è chiusa.</p>
      </div>

      {installedNow && (
        <Notice kind="success">Installazione avviata. Apri EscoAPesca dalla nuova icona per attivare le notifiche.</Notice>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {platform === "android" && manualInstall && (
        <Notice kind="info">
          Per installare EscoAPesca apri il menu del browser e scegli “Installa app” o “Aggiungi alla schermata Home”.
        </Notice>
      )}

      {platform === "ios" && showIosGuide && (
        <ol className="ios-install-steps">
          <li><strong>Tocca Condividi</strong><span>L’icona con il quadrato e la freccia verso l’alto.</span></li>
          <li><strong>Scegli “Aggiungi alla schermata Home”</strong><span>Conferma il nome EscoAPesca.</span></li>
          <li><strong>Apri la nuova icona</strong><span>Da lì potrai attivare gli avvisi sul telefono.</span></li>
        </ol>
      )}

      {!installedNow && (
        <div className="install-app-actions">
          {platform === "android" ? (
            !manualInstall && (
              <button className="button button-primary" disabled={busy || !installReady} type="button" onClick={() => void installAndroid()}>
                {busy ? "Apertura…" : installReady ? "Installa sul telefono" : "Verifica installazione…"}
              </button>
            )
          ) : (
            <button className="button button-primary" type="button" onClick={() => setShowIosGuide((current) => !current)}>
              {showIosGuide ? "Nascondi la guida" : "Mostrami come"}
            </button>
          )}
          <button className="button button-quiet" disabled={busy} type="button" onClick={() => postpone(INSTALL_REMINDER_KEY, setInstallSuppressed)}>
            Non ora
          </button>
        </div>
      )}
    </section>
  );
}
