import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import { loadMyTripFeedback } from "../lib/feedback";
import { readableError } from "../lib/errors";
import { formatTripSchedule } from "../lib/tripExperience";
import {
  canLeaveTripFeedback,
  dashboardTripBucket,
  loadMyTripParticipations,
  tripTimePhase,
  type DashboardTripRole,
  type FishingTripParticipation,
} from "../lib/myTrips";
import {
  loadMyFishingTrips,
  loadMyHiddenTripIds,
  setTripHistoryHidden,
} from "../lib/trips";
import type {
  FishingTrip,
  TripEndPrecision,
  TripParticipationStatus,
  TripStatus,
  TripType,
} from "../types/domain";

const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  draft: "Bozza",
  open: "Aperta",
  confirmed: "Confermata",
  completed: "Completata",
  cancelled: "Annullata",
};

const PARTICIPATION_LABELS: Record<TripParticipationStatus, string> = {
  requested: "Richiesta inviata",
  accepted: "Accettata",
  rejected: "Non accettata",
  cancelled: "Richiesta annullata",
  confirmed: "Confermata",
  completed: "Completata",
  no_show: "Mancata presenza",
};

type DashboardTrip = {
  key: string;
  id: string;
  publicCode: string;
  role: DashboardTripRole;
  title: string;
  techniqueName: string;
  startsAt: string;
  endsAt: string;
  endPrecision: TripEndPrecision;
  provinceCode: string;
  publicZone: string;
  maxParticipants: number;
  tripType: TripType;
  status: TripStatus;
  participationStatus: TripParticipationStatus | null;
  organizerName: string | null;
  feedbackSubmitted: boolean;
  hidden: boolean;
  adminHidden: boolean;
};

function organizedTrip(
  trip: FishingTrip,
  feedbackTripIds: Set<string>,
  hiddenTripIds: Set<string>,
): DashboardTrip {
  return {
    key: `organizer-${trip.id}`,
    id: trip.id,
    publicCode: trip.publicCode,
    role: "organizer",
    title: trip.title,
    techniqueName: trip.techniqueName,
    startsAt: trip.startsAt,
    endsAt: trip.endsAt,
    endPrecision: trip.endPrecision,
    provinceCode: trip.provinceCode,
    publicZone: trip.publicZone,
    maxParticipants: trip.maxParticipants,
    tripType: trip.tripType,
    status: trip.status,
    participationStatus: null,
    organizerName: null,
    feedbackSubmitted: feedbackTripIds.has(trip.id),
    hidden: hiddenTripIds.has(trip.id),
    adminHidden: Boolean(trip.hiddenByAdminAt),
  };
}

function participatingTrip(
  trip: FishingTripParticipation,
  feedbackTripIds: Set<string>,
  hiddenTripIds: Set<string>,
): DashboardTrip {
  return {
    key: `participant-${trip.participantId}`,
    id: trip.id,
    publicCode: trip.publicCode,
    role: "participant",
    title: trip.title,
    techniqueName: trip.techniqueName,
    startsAt: trip.startsAt,
    endsAt: trip.endsAt,
    endPrecision: trip.endPrecision,
    provinceCode: trip.provinceCode,
    publicZone: trip.publicZone,
    maxParticipants: trip.maxParticipants,
    tripType: trip.tripType,
    status: trip.status,
    participationStatus: trip.participationStatus,
    organizerName: trip.organizerName,
    feedbackSubmitted: feedbackTripIds.has(trip.id),
    hidden: hiddenTripIds.has(trip.id),
    adminHidden: false,
  };
}

function canLeaveFeedback(trip: DashboardTrip) {
  return canLeaveTripFeedback(
    trip.role,
    trip.startsAt,
    trip.endsAt,
    trip.status,
    trip.participationStatus,
    trip.feedbackSubmitted,
  );
}

function statusLabel(trip: DashboardTrip) {
  const phase = tripTimePhase(trip.startsAt, trip.endsAt);
  if (trip.adminHidden) return "Oscurata dall’Admin";
  if (trip.status === "cancelled") return "Annullata";
  if (trip.feedbackSubmitted && phase === "past") return "Feedback inviato";

  if (trip.role === "participant" && trip.participationStatus) {
    if (phase === "past" && ["requested", "accepted"].includes(trip.participationStatus)) {
      return "Scaduta";
    }
    if (phase === "past" && trip.participationStatus === "confirmed") {
      return "Feedback richiesto";
    }
    return PARTICIPATION_LABELS[trip.participationStatus];
  }

  if (phase === "past" && trip.status === "open") return "Scaduta";
  if (phase === "past" && trip.status === "confirmed") return "Feedback richiesto";
  if (phase === "in_progress") return "In corso";
  return TRIP_STATUS_LABELS[trip.status];
}

function nextAction(trip: DashboardTrip) {
  const phase = tripTimePhase(trip.startsAt, trip.endsAt);

  if (trip.status === "cancelled") return "Nessuna azione: l’uscita è stata annullata.";
  if (trip.feedbackSubmitted) return "Feedback registrato: grazie per aver aiutato la Beta.";
  if (canLeaveFeedback(trip)) return "Raccontaci se l’uscita si è svolta davvero.";

  if (trip.role === "organizer") {
    if (phase === "past" && trip.status === "open") return "Scaduta senza conferma: non viene conteggiata come uscita svolta.";
    if (trip.status === "completed") return "Esito già registrato.";
    if (phase === "in_progress" && trip.status === "confirmed") return "L’uscita è in corso.";
    if (phase === "in_progress") return "Il periodo è iniziato senza conferma definitiva.";
    if (trip.status === "confirmed") return "Controlla i dettagli privati e il punto d’incontro.";
    return "Gestisci le richieste e conferma quando il gruppo è pronto.";
  }

  switch (trip.participationStatus) {
    case "requested":
      return phase === "past"
        ? "La richiesta è scaduta senza conferma."
        : "Attendi la risposta dell’organizzatore.";
    case "accepted":
      return phase === "past"
        ? "L’uscita non è stata confermata definitivamente."
        : "Sei stato accettato: attendi la conferma definitiva.";
    case "confirmed":
      if (phase === "in_progress") return "L’uscita è in corso.";
      return "Controlla il punto d’incontro condiviso dall’organizzatore.";
    case "rejected":
      return "Nessuna azione: la richiesta non è stata accettata.";
    case "cancelled":
      return "Nessuna azione: hai annullato la richiesta.";
    case "completed":
      return "Partecipazione registrata come completata.";
    case "no_show":
      return "Partecipazione registrata come mancata presenza.";
    default:
      return "Controlla lo stato dell’uscita.";
  }
}

function canOpenDetails(trip: DashboardTrip) {
  if (trip.role === "organizer") return true;
  return ["confirmed", "completed"].includes(trip.status)
    && ["confirmed", "completed"].includes(trip.participationStatus ?? "");
}

function cardDestination(trip: DashboardTrip) {
  if (canLeaveFeedback(trip)) return `/uscite/${trip.id}/feedback`;
  if (canOpenDetails(trip)) return `/uscite/${trip.id}`;
  return null;
}

function TripCardContent({ trip }: { trip: DashboardTrip }) {
  return (
    <>
      <div className="trip-card-heading">
        <span className={`trip-status status-${trip.adminHidden ? "hidden" : trip.status}`}>{statusLabel(trip)}</span>
        <span className="trip-privacy">{trip.tripType === "protected" ? "Spot protetto" : "Uscita libera"}</span>
      </div>
      <span className="trip-code">{trip.publicCode}</span>
      <h3>{trip.title}</h3>
      <p className="trip-date">{formatTripSchedule(trip.startsAt, trip.endsAt, trip.endPrecision)}</p>
      <div className="trip-card-meta">
        <span>{trip.techniqueName}</span>
        <span>{trip.publicZone} · {trip.provinceCode}</span>
        <span>Max {trip.maxParticipants} persone</span>
        <span>{trip.role === "organizer" ? "Organizzata da te" : `Organizza ${trip.organizerName}`}</span>
      </div>
      <p className="trip-card-action">{nextAction(trip)}</p>
      {cardDestination(trip) && (
        <span className="trip-card-action">
          {canLeaveFeedback(trip) ? "Lascia il feedback" : "Apri i dettagli"} <span aria-hidden="true">→</span>
        </span>
      )}
    </>
  );
}

function TripCard({
  trip,
  onToggleHidden,
  historyUpdating,
}: {
  trip: DashboardTrip;
  onToggleHidden?: (trip: DashboardTrip) => void;
  historyUpdating?: boolean;
}) {
  const destination = cardDestination(trip);

  return (
    <article className="trip-list-card">
      {destination ? (
        <Link className="trip-list-card-link" to={destination}>
          <TripCardContent trip={trip} />
        </Link>
      ) : (
        <TripCardContent trip={trip} />
      )}
      {onToggleHidden && (
        <div className="trip-history-actions">
          <button
            className="button button-secondary"
            disabled={historyUpdating}
            type="button"
            onClick={() => onToggleHidden(trip)}
          >
            {historyUpdating
              ? "Aggiornamento…"
              : trip.hidden
                ? "Ripristina nello storico"
                : "Nascondi dal mio storico"}
          </button>
        </div>
      )}
    </article>
  );
}

function TripSection({
  title,
  trips,
  emptyMessage,
  onToggleHidden,
  updatingTripId,
}: {
  title: string;
  trips: DashboardTrip[];
  emptyMessage: string;
  onToggleHidden?: (trip: DashboardTrip) => void;
  updatingTripId?: string | null;
}) {
  const sectionId = `section-${title.toLowerCase().replace(/\s/g, "-")}`;
  return (
    <section className="trip-list-section" aria-labelledby={sectionId}>
      <h2 id={sectionId}>{title} ({trips.length})</h2>
      {trips.length > 0 ? (
        <div className="trip-list-grid">
          {trips.map((trip) => (
            <TripCard
              key={trip.key}
              trip={trip}
              onToggleHidden={onToggleHidden}
              historyUpdating={updatingTripId === trip.id}
            />
          ))}
        </div>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </section>
  );
}

export function MyTripsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigationNotice = (location.state as { notice?: string } | null)?.notice;
  const [organized, setOrganized] = useState<FishingTrip[]>([]);
  const [participating, setParticipating] = useState<FishingTripParticipation[]>([]);
  const [feedbackTripIds, setFeedbackTripIds] = useState<Set<string>>(new Set());
  const [hiddenTripIds, setHiddenTripIds] = useState<Set<string>>(new Set());
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(navigationNotice ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    void Promise.all([
      loadMyFishingTrips(user.id),
      loadMyTripParticipations(),
      loadMyTripFeedback(),
      loadMyHiddenTripIds(),
    ])
      .then(([loadedOrganized, loadedParticipating, loadedFeedback, loadedHiddenTripIds]) => {
        if (!active) return;
        setOrganized(loadedOrganized);
        setParticipating(loadedParticipating);
        setFeedbackTripIds(new Set(loadedFeedback.map((item) => item.tripId)));
        setHiddenTripIds(loadedHiddenTripIds);
      })
      .catch((caught) => {
        if (active) setError(readableError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user]);

  const grouped = useMemo(() => {
    const now = Date.now();
    const entries = [
      ...organized.map((trip) => organizedTrip(trip, feedbackTripIds, hiddenTripIds)),
      ...participating.map((trip) => participatingTrip(trip, feedbackTripIds, hiddenTripIds)),
    ];
    const result = {
      organized: [] as DashboardTrip[],
      participating: [] as DashboardTrip[],
      past: [] as DashboardTrip[],
      hidden: [] as DashboardTrip[],
    };

    for (const trip of entries) {
      if (trip.hidden) {
        result.hidden.push(trip);
        continue;
      }

      const bucket = dashboardTripBucket(
        trip.role,
        trip.startsAt,
        trip.endsAt,
        trip.status,
        trip.participationStatus,
        now,
      );
      result[bucket].push(trip);
    }

    result.organized.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    result.participating.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    result.past.sort((a, b) => b.endsAt.localeCompare(a.endsAt));
    result.hidden.sort((a, b) => b.endsAt.localeCompare(a.endsAt));
    return result;
  }, [organized, participating, feedbackTripIds, hiddenTripIds]);

  async function toggleHistoryVisibility(trip: DashboardTrip) {
    setUpdatingTripId(trip.id);
    setError(null);
    setNotice(null);
    try {
      await setTripHistoryHidden(trip.id, !trip.hidden);
      setHiddenTripIds((current) => {
        const next = new Set(current);
        if (trip.hidden) next.delete(trip.id);
        else next.add(trip.id);
        return next;
      });
      setNotice(trip.hidden
        ? "Uscita ripristinata nel tuo storico."
        : "Uscita nascosta. Potrai ripristinarla dall’archivio personale.");
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setUpdatingTripId(null);
    }
  }

  if (loading) return <div className="page-status">Caricamento delle tue uscite…</div>;

  return (
    <section className="page-wide trips-page">
      <div className="profile-heading">
        <div>
          <div className="eyebrow">La tua attività</div>
          <h1>Le mie uscite</h1>
          <p>Controlla cosa hai organizzato, le uscite a cui partecipi e la prossima azione necessaria.</p>
        </div>
        <Link className="button button-primary" to="/crea-uscita">Crea un’uscita</Link>
      </div>

      {notice && <Notice kind="success">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <>
          <TripSection
            title="Organizzate da me"
            trips={grouped.organized}
            emptyMessage="Non hai uscite organizzate attive."
          />
          <TripSection
            title="Uscite a cui partecipo"
            trips={grouped.participating}
            emptyMessage="Non hai partecipazioni attive. Trova un’uscita compatibile per iniziare."
          />
          <TripSection
            title="Passate"
            trips={grouped.past}
            emptyMessage="Qui compariranno le uscite terminate, annullate o non confermate."
            onToggleHidden={(trip) => void toggleHistoryVisibility(trip)}
            updatingTripId={updatingTripId}
          />
          {grouped.hidden.length > 0 && (
            <TripSection
              title="Archivio personale"
              trips={grouped.hidden}
              emptyMessage="Non hai uscite nascoste."
              onToggleHidden={(trip) => void toggleHistoryVisibility(trip)}
              updatingTripId={updatingTripId}
            />
          )}
      </>
    </section>
  );
}
