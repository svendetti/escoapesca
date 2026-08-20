import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { loadMyFishingTrips } from "../lib/trips";
import type { FishingTrip, TripStatus } from "../types/domain";

const STATUS_LABELS: Record<TripStatus, string> = {
  draft: "Bozza",
  open: "Aperta",
  confirmed: "Confermata",
  completed: "Completata",
  cancelled: "Annullata",
};

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function TripCard({ trip }: { trip: FishingTrip }) {
  return (
    <Link className="trip-list-card" to={`/uscite/${trip.id}`}>
      <article>
        <div className="trip-card-heading">
          <span className={`trip-status status-${trip.status}`}>{STATUS_LABELS[trip.status]}</span>
          <span className="trip-privacy">{trip.tripType === "protected" ? "Spot protetto" : "Uscita libera"}</span>
        </div>
        <h3>{trip.title}</h3>
        <p className="trip-date">{dateFormatter.format(new Date(trip.startsAt))}</p>
        <div className="trip-card-meta">
          <span>{trip.techniqueName}</span>
          <span>{trip.publicZone} · {trip.provinceCode}</span>
          <span>Max {trip.maxParticipants} persone</span>
        </div>
        <span className="trip-card-action">Apri e gestisci <span aria-hidden="true">→</span></span>
      </article>
    </Link>
  );
}

function TripSection({ title, trips }: { title: string; trips: FishingTrip[] }) {
  if (trips.length === 0) return null;
  return (
    <section className="trip-list-section" aria-labelledby={`section-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <h2 id={`section-${title.toLowerCase().replace(/\s/g, "-")}`}>{title}</h2>
      <div className="trip-list-grid">
        {trips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
      </div>
    </section>
  );
}

export function MyTripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<FishingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    void loadMyFishingTrips(user.id)
      .then((loaded) => {
        if (active) setTrips(loaded);
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
    return {
      upcoming: trips.filter((trip) => trip.status !== "cancelled" && new Date(trip.startsAt).getTime() >= now),
      past: trips.filter((trip) => trip.status !== "cancelled" && new Date(trip.startsAt).getTime() < now),
      cancelled: trips.filter((trip) => trip.status === "cancelled"),
    };
  }, [trips]);

  if (loading) return <div className="page-status">Caricamento delle tue uscite…</div>;

  return (
    <section className="page-wide trips-page">
      <div className="profile-heading">
        <div>
          <div className="eyebrow">Organizzate da me</div>
          <h1>Le mie uscite</h1>
          <p>Rivedi le uscite che hai pubblicato e gestisci quelle ancora aperte.</p>
        </div>
        <Link className="button button-primary" to="/crea-uscita">Crea un’uscita</Link>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      {!error && trips.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">≈</span>
          <h2>La prima uscita parte da qui</h2>
          <p>Pubblica una proposta semplice: tecnica, zona indicativa e orario.</p>
          <Link className="button button-primary" to="/crea-uscita">Crea la prima uscita</Link>
        </div>
      ) : (
        <>
          <TripSection title="Prossime" trips={grouped.upcoming} />
          <TripSection title="Passate" trips={grouped.past} />
          <TripSection title="Annullate" trips={grouped.cancelled} />
        </>
      )}
    </section>
  );
}
