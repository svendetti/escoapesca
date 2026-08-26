"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { rememberReturnPath, withReturnPath } from "../../../src/lib/returnPath";

type ActionMode =
  | "loading"
  | "guest"
  | "profile"
  | "ready"
  | "manage"
  | "requested"
  | "accepted"
  | "rejected"
  | "confirmed"
  | "completed"
  | "no_show"
  | "error";

const STATUS_COPY: Partial<Record<ActionMode, string>> = {
  requested: "Richiesta inviata. L’organizzatore deve ancora valutarla.",
  accepted: "Richiesta accettata. Attendi la conferma del gruppo.",
  rejected: "La richiesta non è stata accettata.",
  confirmed: "La tua partecipazione è confermata.",
  completed: "Hai partecipato a questa uscita.",
  no_show: "La partecipazione risulta non completata.",
};

export function PublicTripAction({
  tripId,
  supabaseUrl,
  supabasePublishableKey,
}: {
  tripId: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
}) {
  const [mode, setMode] = useState<ActionMode>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnTarget = `/u/${tripId}`;
  const client = useMemo(
    () => supabaseUrl && supabasePublishableKey
      ? createClient(supabaseUrl, supabasePublishableKey)
      : null,
    [supabasePublishableKey, supabaseUrl],
  );

  useEffect(() => {
    if (!client) {
      setMode("error");
      return;
    }

    let active = true;
    void client.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const userId = data.session?.user.id;
      if (!userId) {
        setMode("guest");
        return;
      }

      const [profileResult, ownTripResult, participationResult] = await Promise.all([
        client
          .from("fisher_profiles")
          .select("completed_at")
          .eq("user_id", userId)
          .maybeSingle(),
        client
          .from("fishing_trips")
          .select("id")
          .eq("id", tripId)
          .eq("organizer_user_id", userId)
          .maybeSingle(),
        client
          .from("trip_participants")
          .select("status")
          .eq("trip_id", tripId)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (!active) return;
      if (ownTripResult.data) {
        setMode("manage");
      } else if (participationResult.data?.status === "cancelled") {
        setMode(profileResult.data?.completed_at ? "ready" : "profile");
      } else if (participationResult.data?.status) {
        setMode(participationResult.data.status as ActionMode);
      } else if (!profileResult.data?.completed_at) {
        setMode("profile");
      } else {
        setMode("ready");
      }
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
    if (mode !== "ready" || !client) return;

    setBusy(true);
    setError(null);
    try {
      const { error: requestError } = await client.rpc("request_trip_participation", {
        p_trip_id: tripId,
      });
      if (requestError) throw requestError;
      setMode("requested");
    } catch {
      setError("Non è stato possibile inviare la richiesta. Controlla lo stato dell’uscita e riprova.");
    } finally {
      setBusy(false);
    }
  }

  if (STATUS_COPY[mode]) {
    return <p className="public-trip-action-state" aria-live="polite">{STATUS_COPY[mode]}</p>;
  }

  if (mode === "error") {
    return <p className="public-trip-action-state" role="alert">Accesso temporaneamente non disponibile.</p>;
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
