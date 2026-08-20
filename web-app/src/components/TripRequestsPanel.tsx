import { useEffect, useMemo, useState } from "react";
import { Notice } from "./Notice";
import { readableError } from "../lib/errors";
import {
  confirmFishingTrip,
  decideTripParticipation,
  loadTripParticipationRequests,
  mergeParticipationDecision,
} from "../lib/trips";
import type {
  FishingTrip,
  SkillLevel,
  TripParticipationRequest,
  TripParticipationStatus,
} from "../types/domain";

const STATUS_LABELS: Record<TripParticipationStatus, string> = {
  requested: "Da valutare",
  accepted: "Accettata",
  rejected: "Rifiutata",
  cancelled: "Annullata dall’utente",
  confirmed: "Confermata",
  completed: "Completata",
  no_show: "Assenza registrata",
};

const SKILL_LABELS: Record<SkillLevel, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Esperto",
};

const requestedFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = {
  trip: FishingTrip;
  onConfirmed: () => void;
};

export function TripRequestsPanel({ trip, onConfirmed }: Props) {
  const [requests, setRequests] = useState<TripParticipationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void loadTripParticipationRequests(trip.id)
      .then((loaded) => {
        if (active) setRequests(loaded);
      })
      .catch((caught) => {
        if (active) setError(readableError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [trip.id]);

  const summary = useMemo(() => ({
    pending: requests.filter((request) => request.status === "requested").length,
    accepted: requests.filter((request) => request.status === "accepted").length,
    confirmed: requests.filter((request) => request.status === "confirmed").length,
  }), [requests]);

  const canManage = trip.status === "open"
    && new Date(trip.startsAt).getTime() > Date.now();
  const availablePlaces = Math.max(
    trip.maxParticipants - 1 - summary.accepted - summary.confirmed,
    0,
  );

  async function decide(
    request: TripParticipationRequest,
    decision: "accepted" | "rejected",
  ) {
    setActionId(request.id);
    setError(null);
    setNotice(null);
    try {
      const result = await decideTripParticipation(request.id, decision);
      setRequests((current) => mergeParticipationDecision(current, result));
      setNotice(decision === "accepted"
        ? `${request.displayName} è stato accettato.`
        : `La richiesta di ${request.displayName} è stata rifiutata.`);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setActionId(null);
    }
  }

  async function confirmTrip() {
    setConfirming(true);
    setError(null);
    setNotice(null);
    try {
      const result = await confirmFishingTrip(trip.id);
      setRequests((current) => current.map((request) => {
        if (request.status === "accepted") {
          return { ...request, status: "confirmed", decidedAt: result.confirmed_at };
        }
        if (request.status === "requested") {
          return { ...request, status: "rejected", decidedAt: result.confirmed_at };
        }
        return request;
      }));
      onConfirmed();
      setNotice(`Uscita confermata con ${result.confirmed_participant_count} partecipante${result.confirmed_participant_count === 1 ? "" : "i"}.`);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <section className="trip-requests-panel" aria-labelledby="requests-title">
      <div className="trip-requests-heading">
        <div>
          <div className="eyebrow">Partecipazione</div>
          <h2 id="requests-title">Richieste ricevute</h2>
          <p>
            {summary.pending} da valutare · {summary.accepted + summary.confirmed} accettate · {availablePlaces} posti disponibili
          </p>
        </div>
        {canManage && (
          <button
            className="button button-primary"
            disabled={confirming || summary.accepted < 1}
            type="button"
            onClick={() => void confirmTrip()}
          >
            {confirming ? "Conferma…" : "Conferma l’uscita"}
          </button>
        )}
      </div>

      {canManage && summary.accepted < 1 && (
        <p className="confirmation-hint">Accetta almeno una persona prima di confermare definitivamente.</p>
      )}
      {trip.status === "confirmed" && (
        <Notice kind="info">Uscita confermata. I dettagli riservati saranno aggiunti nel prossimo aggiornamento.</Notice>
      )}
      {notice && <Notice kind="success">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      {loading ? (
        <p className="requests-empty">Caricamento richieste…</p>
      ) : requests.length === 0 ? (
        <p className="requests-empty">Non hai ancora ricevuto richieste per questa uscita.</p>
      ) : (
        <div className="request-list">
          {requests.map((request) => {
            const busy = actionId === request.id;
            const canAccept = canManage
              && request.status === "requested"
              && availablePlaces > 0;
            const canReject = canManage && request.status === "requested";

            return (
              <article className="request-card" key={request.id}>
                <div className="request-person">
                  <span className="request-avatar" aria-hidden="true">
                    {request.displayName.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <div>
                    <h3>{request.displayName}</h3>
                    <p>
                      {request.skillLevel ? SKILL_LABELS[request.skillLevel] : "Livello non indicato"}
                      {" · "}Richiesta {requestedFormatter.format(new Date(request.requestedAt))}
                    </p>
                  </div>
                </div>
                <span className={`participation-state state-${request.status}`}>
                  {STATUS_LABELS[request.status]}
                </span>
                {(canAccept || canReject) && (
                  <div className="request-actions">
                    <button
                      className="button button-primary"
                      disabled={busy || !canAccept}
                      type="button"
                      onClick={() => void decide(request, "accepted")}
                    >
                      {busy ? "Aggiornamento…" : "Accetta"}
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={busy}
                      type="button"
                      onClick={() => void decide(request, "rejected")}
                    >
                      Rifiuta
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
