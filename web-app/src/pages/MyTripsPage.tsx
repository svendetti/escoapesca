import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import {
  dashboardTripBucket,
  loadMyTripParticipations,
  tripTimePhase,
  type DashboardTripRole,
  type FishingTripParticipation,
} from "../lib/myTrips";
import { loadMyFishingTrips } from "../lib/trips";
import type {
  FishingTrip,
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

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
});

type DashboardTrip = {
  key: string;
  id: string;
  role: DashboardTripRole;
  title: string;
  techniqueName: string;
  startsAt: string;
  endsAt: string;
  provinceCode: string;
  publicZone: string;
  maxParticipants: number;
  tripType: TripType;
  status: TripStatus;
  participationStatus: TripParticipationStatus | null;
  organizerName: string | null;
};

function organizedTrip(trip: FishingTrip): DashboardTrip {
  return {
    key: `organizer-${trip.id}`,
    id: trip.id,
    role: "organizer",
    title: trip.title,
    techniqueName: trip.techniqueName,
    startsAt: trip.startsAt,
    endsAt: trip.endsAt,
    provinceCode: trip.provinceCode,
    publicZone: trip.publicZone,
    maxParticipants: trip.maxParticipants,
    tripType: trip.tripType,
    status: trip.status,
    participationStatus: null,
    organizerName: null,
  };
}

function participatingTrip(trip: FishingTripParticipation): DashboardTrip {
  return {
    key: `participant-${trip.participantId}`,
    id: trip.id,
    role: "participant",
    title: trip.title,
    techniqueName: trip.techniqueName,
    startsAt: trip.startsAt,
    endsAt: trip.endsAt,
    provinceCode: trip.provinceCode,
    publicZone: trip.publicZone,
    maxParticipants: trip.maxParticipants,
    tripType: trip.tripType,
    status: trip.status,
    participationStatus: trip.participationStatus,
    organizerName: trip.organizerName,
  };
}

function statusLabel(trip: DashboardTrip) {
  const phase = tripTimePhase(trip.startsAt, trip.endsAt);
  if (trip.status === "cancelled") return "Annullata";

  if (trip.role === "participant" && trip.participationStatus) {
    if (phase === "past" && ["requested", "accepted"].includes(trip.participationStatus)) {
      return "Scaduta";
    }
    if (phase === "past" && trip.participationStatus === "confirmed") {
      return "Da verificare";
    }
    return PARTICIPATION_LABELS[trip.participationStatus];
  }

  if (phase === "past" && trip.status === "open") return "Scaduta";
  if (phase === "past" && trip.status === "confirmed") return "Da verificare";
  if (phase === "in_progress") return "In corso";
  return TRIP_STATUS_LABELS[trip.status];
}

function nextAction(trip: DashboardTrip) {
  const phase = tripTimePhase(trip.startsAt, trip.endsAt);

  if (trip.status === "cancelled") return "Nessuna azione: l’uscita è stata annullata.";

  if (trip.role === "organizer") {
    if (phase === "past" && trip.status === "open") return "Scaduta senza conferma: non viene conteggiata come uscita svolta.";
    if (phase === "past" && trip.status === "confirmed") return "Da verificare: il feedback sarà disponibile a breve.";
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
      if (phase === "past") return "Da verificare: il feedback sarà disponibile a breve.";
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

function TripCardContent({ trip }: { trip: DashboardTrip }) {
  const startsAt = new Date(trip.startsAt);
  const endsAt = new Date(trip.endsAt);

  return (
    <>
      <div className="trip-card-heading">
        <span className={`trip-status status-${trip.status}`}>{statusLabel(trip)}</span>
        <span className="trip-privacy">{trip.tripType === "protected" ? "Spot protetto" : "Uscita libera"}</span>
      </div>
      <h3>{trip.title}</h3>
      <p className="trip-date">
        {dateFormatter.format(startsAt)} · {timeFormatter.format(startsAt)}–{timeFormatter.format(endsAt)}
      </p>
      <div className="trip-card-meta">
        <span>{trip.techniqueName}</span>
        <span>{trip.publicZone} · {trip.provinceCode}</span>
        <span>Max {trip.maxParticipants} persone</span>
        <span>{trip.role === "organizer" ? "Organizzata da te" : `Organizza ${trip.organizerName}`}</span>
      </div>
      <p className="trip-card-action">{nextAction(trip)}</p>
      {canOpenDetails(trip) && (
        <span className="trip-card-action">Apri i dettagli <span aria-hidden="true">→</span></span>
      )}
    </>
  );
}

function TripCard({ trip }: { trip: DashboardTrip }) {
  if (canOpenDetails(trip)) {
    return (
      <Link className="trip-list-card" to={`/uscite/${trip.id}`}>
        <article><TripCardContent trip={trip} /></article>
      </Link>
    );
  }

  return (
    <article className="trip-list-card">
      <TripCardContent trip={trip} />
    </article>
  );
}

function TripSection({
  title,
  trips,
  emptyMessage,
}: {
  title: string;
  trips: DashboardTrip[];
  emptyMessage: string;
}) {
  const sectionId = `section-${title.toLowerCase().replace(/\s/g, "-")}`;
  return (
    <section className="trip-list-section" aria-labelledby={sectionId}>
      <h2 id={sectionId}>{title} ({trips.length})</h2>
      {trips.length > 0 ? (
        <div className="trip-list-grid">
          {trips.map((trip) => <TripCard key={trip.key} trip={trip} />)}
        </div>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </section>
  );
}

export function MyTripsPage() {
  const { user } = useAuth();
  const [organized, setOrganized] = useState<FishingTrip[]>([]);
  const [participating, setParticipating] = useState<FishingTripParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    void Promise.all([
      loadMyFishingTrips(user.id),
      loadMyTripParticipations(),
    ])
      .then(([loadedOrganized, loadedParticipating]) => {
        if (!active) return;
        setOrganized(loadedOrganized);
        setParticipating(loadedParticipating);
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
      ...organized.map(organizedTrip),
      ...participating.map(participatingTrip),
    ];
    const result = {
      organized: [] as DashboardTrip[],
      participating: [] as DashboardTrip[],
      past: [] as DashboardTrip[],
    };

    for (const trip of entries) {
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
    return result;
  }, [organized, participating]);

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

      {error && <Notice kind="error">{error}</Notice>}

      {!error && (
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
            title="Passate e archiviate"
            trips={grouped.past}
            emptyMessage="Qui compariranno le uscite terminate, annullate o non confermate."
          />
        </>
      )}
    </section>
  );
}
