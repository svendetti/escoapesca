import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Notice } from "../components/Notice";
import { TripGroupPanel } from "../components/TripGroupPanel";
import { TripRequestsPanel } from "../components/TripRequestsPanel";
import { TripPrivateDetailsPanel } from "../components/TripPrivateDetailsPanel";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { loadMyTripFeedback } from "../lib/feedback";
import { loadMyTripParticipations } from "../lib/myTrips";
import { participationProgressNotice } from "../lib/participationProgress";
import { canInviteToTrip, shouldShowFeedbackPrompt, shouldShowTripShare } from "../lib/tripPresentation";
import { formatTripSchedule } from "../lib/tripExperience";
import { tripPreviewPath } from "../lib/tripPreview";
import {
  cancelFishingTrip,
  deleteFishingTripDraft,
  loadFishingTripForViewer,
  loadTripOrganizerSummary,
  type TripOrganizerSummary,
} from "../lib/trips";
import type { FishingTrip, RecommendedLevel, TripParticipationStatus, TripStatus } from "../types/domain";

const STATUS_LABELS: Record<TripStatus, string> = {
  draft: "Bozza", open: "Aperta", confirmed: "Confermata", completed: "Completata", cancelled: "Annullata",
};
const LEVEL_LABELS: Record<RecommendedLevel, string> = {
  any: "Qualsiasi livello", beginner: "Principiante", intermediate: "Intermedio", expert: "Esperto",
};

export function TripDetailPage() {
  const { user, isAdmin } = useAuth();
  const { tripId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationNotice = (location.state as { notice?: string } | null)?.notice;
  const [trip, setTrip] = useState<FishingTrip | null>(null);
  const [organizer, setOrganizer] = useState<TripOrganizerSummary | null>(null);
  const [participationStatus, setParticipationStatus] = useState<TripParticipationStatus | null>(null);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(navigationNotice ?? null);
  const [error, setError] = useState<string | null>(null);
  const [showCancellation, setShowCancellation] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showDraftDeletion, setShowDraftDeletion] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState(false);

  useEffect(() => {
    if (!user || !tripId) return;
    let active = true;
    void Promise.all([
      loadFishingTripForViewer(tripId),
      loadMyTripParticipations().catch(() => []),
      loadMyTripFeedback().catch(() => null),
      loadTripOrganizerSummary(tripId).catch(() => null),
    ])
      .then(([loaded, participations, feedback, loadedOrganizer]) => {
        if (!active) return;
        setTrip(loaded);
        setOrganizer(loadedOrganizer);
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

  async function deleteDraft() {
    if (!trip) return;
    setDeletingDraft(true);
    setError(null);
    try {
      await deleteFishingTripDraft(trip.id);
      navigate("/mie-uscite", {
        replace: true,
        state: { notice: "Bozza eliminata definitivamente." },
      });
    } catch (caught) {
      setError(readableError(caught));
      setDeletingDraft(false);
    }
  }

  if (loading) return <div className="page-status">Caricamento dell’uscita…</div>;
  if (error && !trip) {
    return (
      <section className="page-narrow auth-card center-card">
        <h1>Uscita non disponibile</h1>
        <Notice kind="error">{error}</Notice>
        <Link className="button button-secondary" to={tripPreviewPath(tripId)}>Apri la scheda dell’uscita</Link>
        <Link className="button button-secondary" to="/mie-uscite">Torna alle mie uscite</Link>
      </section>
    );
  }
  if (!trip) return null;

  const startsAt = new Date(trip.startsAt);
  const isOrganizer = trip.organizerUserId === user?.id;
  const canManage = isOrganizer && trip.status === "open" && startsAt.getTime() > Date.now();
  const canInvite = canInviteToTrip(trip, isOrganizer);
  const showShare = isOrganizer && shouldShowTripShare(trip);
  const canLeaveFeedback = hasSubmittedFeedback === false && shouldShowFeedbackPrompt(trip, hasSubmittedFeedback);
  const progressNotice = participationProgressNotice(participationStatus);

  return (
    <section className="page-wide trip-detail-page">
      <Link className="back-link" to="/mie-uscite">← Le mie uscite</Link>

      <div className="trip-detail-hero">
        <div>
          <div className="trip-card-heading">
            <span className={`trip-status status-${trip.status}`}>{STATUS_LABELS[trip.status]}</span>
            <span className="trip-privacy">{trip.tripType === "protected" ? "Spot protetto" : "Uscita libera"}</span>
          </div>
          <span className="trip-code">{trip.publicCode}</span>
          <h1>{trip.title}</h1>
          <p>{formatTripSchedule(trip.startsAt, trip.endsAt, trip.endPrecision)}</p>
          <dl className="trip-data-list trip-hero-facts" aria-label="Informazioni sull’uscita">
            <div><dt>Tecnica</dt><dd>{trip.techniqueName}</dd></div>
            <div><dt>Acqua</dt><dd>{trip.waterType === "sea" ? "Mare" : "Acqua dolce"}</dd></div>
            <div><dt>Zona pubblica</dt><dd>{trip.publicZone} · {trip.provinceCode}</dd></div>
            <div><dt>Partecipanti totali</dt><dd>{trip.maxParticipants}, organizzatore incluso</dd></div>
            <div><dt>Livello</dt><dd>{LEVEL_LABELS[trip.recommendedLevel]}</dd></div>
          </dl>
        </div>
        {(canManage || (showShare && !trip.hiddenByAdminAt) || canInvite) && (
        <div className="trip-detail-actions">
          {canManage && <Link className="button button-primary" to={`/uscite/${trip.id}/modifica`}>Modifica</Link>}
          {((showShare && !trip.hiddenByAdminAt) || canInvite) && (
            <Link className="button button-secondary" to={`/uscite/${trip.id}/inviti`}>Invita e condividi</Link>
          )}
        </div>
        )}
      </div>

      {notice && <Notice kind="success">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      {trip.hiddenByAdminAt && (isOrganizer || isAdmin) && (
        <Notice kind="error">
          Questa uscita è stata oscurata dall’amministrazione e non compare nelle pagine pubbliche.
          {trip.hiddenByAdminReason ? ` Motivo: ${trip.hiddenByAdminReason}` : ""}
        </Notice>
      )}

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

      {!isOrganizer && organizer && (
        <section className="trip-detail-card organizer-identity-card">
          {organizer.photoUrl ? (
            <img src={organizer.photoUrl} alt={`Foto di ${organizer.displayName}`} />
          ) : (
            <span className="organizer-avatar-fallback" aria-hidden="true">
              {organizer.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div><small>Organizza</small><strong>{organizer.displayName}</strong></div>
        </section>
      )}

      {canLeaveFeedback && (
        <section className="trip-detail-card">
          <h2>L’uscita è terminata</h2>
          <p>Dicci se si è svolta davvero: bastano pochi secondi e il risultato resta privato.</p>
          <Link className="button button-primary" to={`/uscite/${trip.id}/feedback`}>Lascia il feedback</Link>
        </section>
      )}

      {(trip.description || trip.gearNotes) && (
        <section className="trip-detail-card trip-useful-info">
          <h2>Informazioni utili</h2>
          {trip.description && <p className="preserve-lines">{trip.description}</p>}
          {trip.gearNotes && <p className="preserve-lines">{trip.gearNotes}</p>}
        </section>
      )}

      <TripGroupPanel
        tripId={trip.id}
        enabled={isOrganizer || ["accepted", "confirmed", "completed"].includes(participationStatus ?? "")}
      />
      {trip.tripType === "protected" ? (
        <Notice kind="info">La posizione precisa non è pubblica e resta separata dalla zona generica.</Notice>
      ) : trip.publicMeetingPoint ? (
        <section className="trip-detail-card">
          <h2>Indicazioni pubbliche</h2>
          <p className="preserve-lines">{trip.publicMeetingPoint}</p>
        </section>
      ) : null}
      {isOrganizer ? (
        <details className="trip-detail-card trip-detail-disclosure trip-private-disclosure">
          <summary>Punto d’incontro e indicazioni private</summary>
          <div className="trip-disclosure-content">
            <TripPrivateDetailsPanel
              trip={trip}
              isOrganizer={isOrganizer}
              participationStatus={participationStatus}
            />
          </div>
        </details>
      ) : (
        <TripPrivateDetailsPanel
          trip={trip}
          isOrganizer={isOrganizer}
          participationStatus={participationStatus}
        />
      )}

      {trip.status === "cancelled" && (
        <section className="trip-detail-card cancelled-summary">
          <h2>Uscita annullata</h2>
          <p>{trip.cancellationReason || "Nessuna motivazione indicata."}</p>
        </section>
      )}

      {isOrganizer && trip.status === "draft" && (
        <section className="danger-zone">
          <div>
            <h2>Elimina la bozza</h2>
            <p>È vuota per gli altri utenti e non contiene partecipazioni: questa azione è definitiva.</p>
          </div>
          {!showDraftDeletion ? (
            <button className="button button-danger" type="button" onClick={() => setShowDraftDeletion(true)}>
              Elimina bozza
            </button>
          ) : (
            <div className="inline-actions">
              <button className="button button-danger" disabled={deletingDraft} type="button" onClick={() => void deleteDraft()}>
                {deletingDraft ? "Eliminazione…" : "Conferma eliminazione"}
              </button>
              <button className="button button-secondary" disabled={deletingDraft} type="button" onClick={() => setShowDraftDeletion(false)}>
                Indietro
              </button>
            </div>
          )}
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
