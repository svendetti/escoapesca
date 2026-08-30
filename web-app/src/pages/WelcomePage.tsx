import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import { loadMyTripFeedback } from "../lib/feedback";
import {
  buildHomeDashboard,
  homeDiscoveryPreview,
  type HomeDashboard,
  type HomeTrip,
} from "../lib/homeDashboard";
import { loadMyTripParticipations } from "../lib/myTrips";
import { loadNotifications } from "../lib/notifications";
import { readableError } from "../lib/errors";
import { formatTripSchedule } from "../lib/tripExperience";
import {
  loadDiscoverableTrips,
  loadMyFishingTrips,
  loadTripParticipationRequestSummary,
  type TripParticipationRequestSummary,
} from "../lib/trips";
import {
  EMPTY_TRIP_DISCOVERY_FILTERS,
  type AppNotification,
  type FishingTrip,
  type FishingTripDiscovery,
} from "../types/domain";
import type { FishingTripParticipation } from "../lib/myTrips";

type AuthenticatedHomeData = {
  dashboard: HomeDashboard;
  organized: FishingTrip[];
  participating: FishingTripParticipation[];
  notifications: AppNotification[];
  discoveries: FishingTripDiscovery[];
};

function PublicWelcome() {
  return (
    <section className="welcome page-narrow">
      <div className="eyebrow">Beta Lazio</div>
      <h1>La prossima uscita inizia da un incontro reale.</h1>
      <p>Crea il tuo profilo pescatore, trova un’uscita oppure proponine una, senza esporre pubblicamente gli spot protetti.</p>
      <div className="button-stack">
        <Link className="button button-primary" to="/registrati">Crea il profilo</Link>
        <Link className="button button-secondary" to="/accedi">Ho già un account</Link>
      </div>
      <p className="microcopy">Niente feed, like o chat invasiva. Solo ciò che serve per andare a pesca insieme.</p>
    </section>
  );
}

function nextTripLabel(trip: HomeTrip) {
  if (trip.role === "organizer") {
    return trip.status === "confirmed" ? "Confermata" : "Organizzata da te";
  }
  if (trip.participationStatus === "confirmed") return "Partecipazione confermata";
  return "Richiesta accettata";
}

function nextTripDestination(trip: HomeTrip) {
  if (trip.role === "organizer") return `/uscite/${trip.id}`;
  return trip.status === "confirmed" && trip.participationStatus === "confirmed"
    ? `/uscite/${trip.id}`
    : "/trova-uscita";
}

function AuthenticatedHome({ userId }: { userId: string }) {
  const [data, setData] = useState<AuthenticatedHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [
          organized,
          participating,
          feedback,
          notifications,
          discoverable,
        ] = await Promise.all([
          loadMyFishingTrips(userId),
          loadMyTripParticipations(),
          loadMyTripFeedback(),
          loadNotifications(),
          loadDiscoverableTrips(EMPTY_TRIP_DISCOVERY_FILTERS, userId),
        ]);

        const activeOrganized = organized.filter((trip) => (
          trip.status === "open" && new Date(trip.endsAt).getTime() > Date.now()
        ));
        const requestEntries = await Promise.all(activeOrganized.map(async (trip) => (
          [trip.id, await loadTripParticipationRequestSummary(trip.id)] as const
        )));
        const requestSummaries = new Map<string, TripParticipationRequestSummary>(requestEntries);
        const dashboard = buildHomeDashboard({
          organized,
          participating,
          feedbackTripIds: new Set(feedback.map((item) => item.tripId)),
          requestSummaries,
          notifications,
        });

        if (!active) return;
        setData({
          dashboard,
          organized,
          participating,
          notifications,
          discoveries: homeDiscoveryPreview(discoverable, userId),
        });
      } catch (caught) {
        if (active) setError(readableError(caught));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [userId]);

  if (loading) return <div className="page-status">Prepariamo la tua prossima azione…</div>;

  const noActivity = data
    && data.organized.length === 0
    && data.participating.length === 0
    && data.notifications.length === 0;
  const nextTrip = data?.dashboard.nextTrip ?? null;

  return (
    <section className="page-wide home-dashboard">
      <header className="home-hero">
        <div>
          <div className="eyebrow">La tua EscoAPesca</div>
          <h1>Cosa devi fare adesso?</h1>
          <p>Azioni, prossima uscita e nuove occasioni: tutto quello che serve, senza un feed.</p>
        </div>
        <div className="home-primary-actions" aria-label="Azioni principali">
          <Link className="button button-primary" to="/trova-uscita">Trova un’uscita</Link>
          <Link className="button button-secondary" to="/crea-uscita">Proponi un’uscita</Link>
        </div>
      </header>

      {error && <Notice kind="error">{error}</Notice>}

      {!error && noActivity && (
        <section className="home-empty-state">
          <div className="eyebrow">Inizia da qui</div>
          <h2>Trova la prossima uscita oppure proponine una.</h2>
          <p>Non hai ancora attività da gestire. Puoi cercare un gruppo o creare la tua uscita.</p>
          <div className="home-empty-actions">
            <Link className="button button-primary" to="/trova-uscita">Trova un’uscita</Link>
            <Link className="button button-secondary" to="/crea-uscita">Proponi un’uscita</Link>
          </div>
        </section>
      )}

      {!error && data && !noActivity && (
        <section className="home-section" aria-labelledby="home-actions-title">
          <div className="home-section-heading">
            <div>
              <div className="eyebrow">Priorità</div>
              <h2 id="home-actions-title">Azioni richieste</h2>
            </div>
            <Link to="/mie-uscite">Le mie uscite</Link>
          </div>
          {data.dashboard.actions.length > 0 ? (
            <div className="home-action-list">
              {data.dashboard.actions.map((action, index) => (
                <Link
                  className={`home-action-card${index === 0 ? " primary" : ""}`}
                  key={action.key}
                  to={action.to}
                >
                  <span className="home-action-index">{index === 0 ? "Ora" : index + 1}</span>
                  <span>
                    <strong>{action.title}</strong>
                    <small>{action.description}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="home-quiet">Nessuna azione urgente: puoi preparare con calma la prossima uscita.</p>
          )}
        </section>
      )}

      {!error && nextTrip && (
        <section className="home-section" aria-labelledby="next-trip-title">
          <div className="home-section-heading">
            <div>
              <div className="eyebrow">In calendario</div>
              <h2 id="next-trip-title">Prossima uscita</h2>
            </div>
          </div>
          <article className="home-next-trip">
            <div>
              <span className="trip-status">{nextTripLabel(nextTrip)}</span>
              <span className="trip-code">{nextTrip.publicCode}</span>
              <h3>{nextTrip.title}</h3>
              <p className="home-trip-date">{formatTripSchedule(nextTrip.startsAt, nextTrip.endsAt, nextTrip.endPrecision)}</p>
              <p>{nextTrip.publicZone} · {nextTrip.provinceCode}</p>
            </div>
            <Link className="button button-primary" to={nextTripDestination(nextTrip)}>
              {nextTrip.role === "organizer" ? "Gestisci l’uscita" : nextTrip.status === "confirmed" ? "Apri i dettagli" : "Vedi lo stato"}
            </Link>
          </article>
        </section>
      )}

      {!error && data && (
        <section className="home-section" aria-labelledby="discover-home-title">
          <div className="home-section-heading">
            <div>
              <div className="eyebrow">Nuove occasioni</div>
              <h2 id="discover-home-title">Uscite da scoprire</h2>
            </div>
            <Link to="/trova-uscita">Vedi tutte</Link>
          </div>
          {data.discoveries.length > 0 ? (
            <div className="home-discovery-grid">
              {data.discoveries.map((trip) => (
                <Link className="home-discovery-card" key={trip.id} to="/trova-uscita">
                  <span>{trip.techniqueName}</span>
                  <span className="trip-code">{trip.publicCode}</span>
                  <h3>{trip.title}</h3>
                  <p>{formatTripSchedule(trip.startsAt, trip.endsAt, trip.endPrecision)}</p>
                  <small>{trip.publicZone} · {trip.provinceCode} · {trip.availablePlaces} {trip.availablePlaces === 1 ? "posto" : "posti"}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="home-discovery-empty">
              <p>Nessuna nuova uscita disponibile in questo momento.</p>
              <Link className="button button-secondary" to="/trova-uscita">Apri la ricerca</Link>
            </div>
          )}
        </section>
      )}
    </section>
  );
}

export function WelcomePage() {
  const { user } = useAuth();
  return user ? <AuthenticatedHome userId={user.id} /> : <PublicWelcome />;
}
