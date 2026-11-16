"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { rememberReturnPath, withReturnPath } from "../../../src/lib/returnPath";
import { MAX_REQUEST_MESSAGE_LENGTH } from "../../../src/lib/participationRequest";
import { loadPublicTripActionState, requestPublicTripParticipation, type PublicTripActionMode as ActionMode } from "../../../src/lib/publicTripAction";
import { readableError } from "../../../src/lib/errors";

const STATUS_COPY: Partial<Record<ActionMode, string>> = {
  disabled: "Il tuo account è disabilitato. Non puoi inviare richieste di partecipazione.",
  requested: "Richiesta inviata. L’organizzatore deve ancora valutarla.",
  accepted: "Richiesta accettata. Attendi la conferma del gruppo.",
  rejected: "La richiesta non è stata accettata.",
  confirmed: "La tua partecipazione è confermata.",
  completed: "Hai partecipato a questa uscita.",
  no_show: "La partecipazione risulta non completata.",
};

export function PublicTripAction({
  tripId,
  supabaseUrl = "",
  supabasePublishableKey = "",
  canRequest = true,
  clientOverride,
  returnPath,
}: {
  tripId: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  canRequest?: boolean;
  clientOverride?: SupabaseClient;
  returnPath?: string;
}) {
  const [mode, setMode] = useState<ActionMode>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const returnTarget = returnPath ?? `/u/${tripId}`;
  const client = useMemo(
    () => clientOverride ?? (supabaseUrl && supabasePublishableKey
      ? createClient(supabaseUrl, supabasePublishableKey)
      : null),
    [clientOverride, supabasePublishableKey, supabaseUrl],
  );

  useEffect(() => {
    if (!client) {
      setMode("error");
      return;
    }

    let active = true;
    setMode("loading");
    void loadPublicTripActionState(client, tripId).then((nextMode) => {
      if (active) setMode(nextMode);
    }).catch(() => {
      if (active) setMode("error");
    });

    return () => {
      active = false;
    };
  }, [client, tripId]);

  function goTo(route: string) {
    rememberReturnPath(returnTarget);
    window.location.assign(withReturnPath(route, returnTarget));
  }

  async function requestParticipation() {
    if (mode === "guest") {
      goTo("/accedi");
      return;
    }
    if (mode === "profile") {
      goTo("/profilo");
      return;
    }
    if (mode === "manage") {
      window.location.assign(`/uscite/${tripId}`);
      return;
    }
    if (mode !== "ready" || !client || !canRequest) return;

    setBusy(true);
    setError(null);
    try {
      await requestPublicTripParticipation(client, tripId, message);
      setMode("requested");
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (STATUS_COPY[mode]) {
    return (
      <div className="public-trip-action">
        <p className="public-trip-action-state" aria-live="polite">{STATUS_COPY[mode]}</p>
        {["confirmed", "completed"].includes(mode) && (
          <a className="button button-primary" href={`/uscite/${tripId}`}>Apri i dettagli dell’uscita</a>
        )}
      </div>
    );
  }

  if (mode === "error") {
    return <p className="public-trip-action-state" role="alert">Accesso temporaneamente non disponibile.</p>;
  }

  if (!canRequest && mode === "guest") {
    return <a className="button button-secondary" href={withReturnPath("/accedi", returnTarget)}>Accedi per vedere la tua partecipazione</a>;
  }
  if (!canRequest && (mode === "ready" || mode === "profile")) {
    return <p className="public-trip-action-state">Questa uscita non accetta nuove richieste.</p>;
  }

  const label = mode === "loading"
    ? "Controllo disponibilità…"
    : mode === "profile"
      ? "Completa il profilo"
      : mode === "manage"
        ? "Gestisci la tua uscita"
        : "Chiedi di partecipare";

  return (
    <div className="public-trip-action">
      {mode === "ready" && (
        <label>
          Messaggio per l’organizzatore <span className="optional">opzionale</span>
          <textarea
            rows={3}
            maxLength={MAX_REQUEST_MESSAGE_LENGTH}
            value={message}
            disabled={busy}
            onChange={(event) => setMessage(event.target.value)}
          />
          <span className="field-help">{message.length}/{MAX_REQUEST_MESSAGE_LENGTH}</span>
        </label>
      )}
      <button
        className="button button-primary"
        disabled={busy || mode === "loading"}
        type="button"
        onClick={() => void requestParticipation()}
      >
        {busy ? "Invio…" : label}
      </button>
      {mode === "guest" && (
        <p>Accedi o registrati: dopo il profilo tornerai automaticamente a questa uscita.</p>
      )}
      {error && <p className="public-trip-action-error" role="alert">{error}</p>}
    </div>
  );
}
