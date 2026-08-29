import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Notice } from "../components/Notice";
import { TripInvitePanel } from "../components/TripInvitePanel";
import { TripShareActions } from "../components/TripShareActions";
import { TripRequestsPanel } from "../components/TripRequestsPanel";
import { TripPrivateDetailsPanel } from "../components/TripPrivateDetailsPanel";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { loadMyTripFeedback } from "../lib/feedback";
import { loadMyTripParticipations } from "../lib/myTrips";
import { participationProgressNotice } from "../lib/participationProgress";
import { shouldShowFeedbackPrompt, shouldShowTripShare } from "../lib/tripPresentation";
import { cancelFishingTrip, loadFishingTripForViewer } from "../lib/trips";
import type { FishingTrip, RecommendedLevel, TripParticipationStatus, TripStatus } from "../types/domain";

const STATUS_LABELS: Record<TripStatus, string> = {
  draft: "Bozza", open: "Aperta", confirmed: "Confermata", completed: "Completata", cancelled: "Annullata",
};
const LEVEL_LABELS: Record<RecommendedLevel, string> = {
  any: "Qualsiasi livello", beginner: "Principiante", intermediate: "Intermedio", expert: "Esperto",
};
const dayFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });

export function TripDetailPage() {
  const { user } = useAuth();
  const { tripId = "" } = useParams();
  const location = useLocation();
  const navigationNotice = (location.state as { notice?: string } | null)?.notice;
  const [trip, setTrip] = useState<FishingTrip | null>(null);
  const [participationStatus, setParticipationStatus] = useState<TripParticipationStatus | null>(null);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(navigationNotice ?? null);
  const [error, setError] = useState<string | null>(null);
  const [showCancellation, setShowCancellation] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user || !tripId) return;
    let active = true;
    void Promise.all([
      loadFishingTripForViewer(tripId),
      loadMyTripParticipations().catch(() => []),
      loadMyTripFeedback().catch(() => null),
    ])
      .then(([loaded, participations, feedback]) => {
        if (!active) return;
        setTrip(loaded);
        setParticipationStatus(
          participations.find((participation) => participation.id === tripId)?.participationStatus ?? null,
        );
        setHasSubmittedFeedback(feedback ? feedback.some((entry) => entry.tripId === tripId) : null);
      })
      .catch((caught) => { if (active) setError(readableError(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tripId, user]);

  async function cancelTrip() {
    if (!user || !trip) return;
    setCancelling(true);
    setError(null);
    try {
      const cancelled = await cancelFishingTrip(user.id, trip.id, reason);
      setTrip(cancelled);
      setShowCancellation(false);
      setNotice("Uscita annullata. Rimarrà nello storico per le metriche della Beta.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <div className="page-status">Caricamento dell’uscita…</div>;
  if (error && !trip) {
    return (
      <section className="page-narrow auth-card center-card">
        <h1>Uscita non disponibile</h1>
        <Notice kind="error">{error}</Notice>
        <Link className="button button-secondary" to="/mie-uscite">Torna alle mie uscite</Link>
      </section>
    );
  }
  if (!trip) return null;

  const startsAt = new Date(trip.startsAt);
  const endsAt = new Date(trip.endsAt);
  const isOrganizer = trip.organizerUserId === user?.id;
  const canManage = isOrganizer && trip.status === "open" && startsAt.getTime() > Date.now();
  const showShare = isOrganizer && shouldShowTripShare(trip);
  const canLeaveFeedback = hasSubmittedFeedback === false && shouldShowFeedbackPrompt(trip, hasSubmittedFeedback);
  const progressNotice = participationProgressNotice(participationStatus);

  return (
    <section className="page-wide trip-detail-page">
      <Link className="back-link" to={isOrganizer ? "/mie-uscite" : "/trova-uscita"}>
        ← {isOrganizer ? "Le mie uscite" : "Trova un’uscita"}
      </Link>

      <div className="trip-detail-hero">
        <div>
          <div className="trip-card-heading">
            <span className={`trip-status status-${trip.status}`}>{STATUS_LABELS[trip.status]}</span>
            <span className="trip-privacy">{trip.tripType === "protected" ? "Spot protetto" : "Uscita libera"}</span>
          </div>
          <h1>{trip.title}</h1>
          <p>{dayFormatter.format(startsAt)} · {timeFormatter.format(startsAt)}–{timeFormatter.format(endsAt)}</p>
        </div>
        {canManage && <Link className="button button-primary" to={`/uscite/${trip.id}/modifica`}>Modifica</Link>}
      </div>

      {notice && <Notice kind="success">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      {showShare && (
        <section className="trip-detail-card organizer-share">
          <div>
            <h2>Condividi l’uscita</h2>
            <p>Invia la pagina pubblica senza esporre dettagli privati o dati dei partecipanti.</p>
          </div>
          <TripShareActions data={{
            tripId: trip.id,
            title: trip.title,
            techniqueName: trip.techniqueName,
            publicZone: trip.publicZone,
            startsAt: trip.startsAt,
            availablePlaces: null,
            tripType: trip.tripType,
          }} />
        </section>
      )}

      {canManage && <TripInvitePanel tripId={trip.id} />}

      {canLeaveFeedback && (
        <section className="trip-detail-card">
          <h2>L’uscita è terminata</h2>
          <p>Dicci se si è svolta davvero: bastano pochi secondi e il risultato resta privato.</p>
          <Link className="button button-primary" to={`/uscite/${trip.id}/feedback`}>Lascia il feedback</Link>
        </section>
      )}

      <div className="trip-detail-grid">
        <section className="trip-detail-card">
          <h2>Informazioni</h2>
          <dl className="trip-data-list">
            <div><dt>Tecnica</dt><dd>{trip.techniqueName}</dd></div>
            <div><dt>Acqua</dt><dd>{trip.waterType === "sea" ? "Mare" : "Acqua dolce"}</dd></div>
            <div><dt>Zona pubblica</dt><dd>{trip.publicZone} · {trip.provinceCode}</dd></div>
            <div><dt>Partecipanti totali</dt><dd>{trip.maxParticipants}, organizzatore incluso</dd></div>
            <div><dt>Livello</dt><dd>{LEVEL_LABELS[trip.recommendedLevel]}</dd></div>
          </dl>
        </section>

        <section className="trip-detail-card">
          <h2>Descrizione</h2>
          <p className="preserve-lines">{trip.description}</p>
          {trip.gearNotes && (
            <>
              <h3>Attrezzatura o note</h3>
              <p className="preserve-lines">{trip.gearNotes}</p>
            </>
          )}
        </section>
      </div>

      {isOrganizer ? (
        <TripRequestsPanel
          trip={trip}
          onConfirmed={() => setTrip((current) => current
            ? { ...current, status: "confirmed", updatedAt: new Date().toISOString() }
            : current)}
        />
      ) : progressNotice ? (
        <Notice kind={progressNotice.kind}>{progressNotice.message}</Notice>
      ) : null}

      {trip.tripType === "protected" ? (
        <Notice kind="info">La posizione precisa non è pubblica e resta separata dalla zona generica.</Notice>
      ) : trip.publicMeetingPoint ? (
        <section className="trip-detail-card">
          <h2>Indicazioni pubbliche</h2>
          <p className="preserve-lines">{trip.publicMeetingPoint}</p>
        </section>
      ) : null}
      <TripPrivateDetailsPanel
        trip={trip}
        isOrganizer={isOrganizer}
        participationStatus={participationStatus}
      />

      {trip.status === "cancelled" && (
        <section className="trip-detail-card cancelled-summary">
          <h2>Uscita annullata</h2>
          <p>{trip.cancellationReason || "Nessuna motivazione indicata."}</p>
        </section>
      )}

      {canManage && (
        <section className="danger-zone">
          <div>
            <h2>Devi annullare?</h2>
            <p>L’uscita resterà nello storico e non potrà essere riaperta.</p>
          </div>
          {!showCancellation ? (
            <button className="button button-danger" type="button" onClick={() => setShowCancellation(true)}>
              Annulla uscita
            </button>
          ) : (
            <div className="cancellation-form">
              <label>
                Motivo <span className="optional">opzionale</span>
                <textarea value={reason} maxLength={500} rows={3} onChange={(event) => setReason(event.target.value)} placeholder="Es. Meteo sfavorevole" />
              </label>
              <div className="inline-actions">
                <button className="button button-danger" disabled={cancelling} type="button" onClick={() => void cancelTrip()}>
                  {cancelling ? "Annullamento…" : "Conferma annullamento"}
                </button>
                <button className="button button-secondary" disabled={cancelling} type="button" onClick={() => setShowCancellation(false)}>
                  Indietro
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
