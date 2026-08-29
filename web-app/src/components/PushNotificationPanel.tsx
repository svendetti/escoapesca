import { useEffect, useState } from "react";
import { readableError } from "../lib/errors";
import {
  disablePushNotifications,
  enablePushNotifications,
  inspectPushNotifications,
  sendTestPushNotification,
  type PushState,
} from "../lib/pushNotifications";
import { Notice } from "./Notice";

const COPY: Record<PushState, string> = {
  unsupported: "Questo browser non supporta le notifiche push. Prova con Safari, Chrome o Edge aggiornati.",
  "needs-install": "Su iPhone e iPad aggiungi prima EscoAPesca alla schermata Home da Condividi → Aggiungi alla schermata Home, poi aprila dall’icona.",
  denied: "Le notifiche sono bloccate nelle impostazioni del browser o del telefono. Riattivale lì e torna su questa pagina.",
  inactive: "Attivale per ricevere un avviso con il suono predefinito del telefono anche quando EscoAPesca è chiusa.",
  active: "Notifiche attive su questo dispositivo. Suono e vibrazione dipendono dalle impostazioni del telefono, da Silenzioso e da Focus/Non disturbare.",
};

export function PushNotificationPanel() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void inspectPushNotifications(true)
      .then((loaded) => { if (active) setState(loaded); })
      .catch((caught) => { if (active) setError(readableError(caught)); })
      .finally(() => { if (active) setState((current) => current ?? "inactive"); });
    return () => { active = false; };
  }, []);

  async function change(enable: boolean) {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const next = enable ? await enablePushNotifications() : await disablePushNotifications();
      setState(next);
      if (next === "active") setNotice("Notifiche attivate su questo dispositivo.");
      if (!enable && next === "inactive") setNotice("Notifiche disattivate su questo dispositivo.");
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await sendTestPushNotification();
      setNotice("Notifica di prova in coda: dovrebbe arrivare entro circa un minuto.");
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="push-notification-panel">
      <div>
        <div className="eyebrow">Avvisi sul telefono</div>
        <h2>Notifiche con suono</h2>
        <p>{state ? COPY[state] : "Controllo del dispositivo…"}</p>
      </div>
      {notice && <Notice kind="success">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <div className="inline-actions">
        {state === "active" ? (
          <>
            <button className="button button-primary" disabled={busy} type="button" onClick={() => void sendTest()}>
              {busy ? "Attendi…" : "Invia notifica di prova"}
            </button>
            <button className="button button-secondary" disabled={busy} type="button" onClick={() => void change(false)}>
              Disattiva su questo dispositivo
            </button>
          </>
        ) : state === "inactive" ? (
          <button className="button button-primary" disabled={busy} type="button" onClick={() => void change(true)}>
            {busy ? "Attivazione…" : "Attiva notifiche sul telefono"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
