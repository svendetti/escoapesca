import { type FormEvent, useEffect, useState } from "react";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { loadDiscoverableTrips, loadFishingTechniques } from "../lib/trips";
import {
  EMPTY_TRIP_DISCOVERY_FILTERS,
  LAZIO_PROVINCES,
  type CatalogItem,
  type FishingTripDiscovery,
  type RecommendedLevel,
  type TripDiscoveryFilters,
} from "../types/domain";

const LEVEL_LABELS: Record<RecommendedLevel, string> = {
  any: "Tutti i livelli",
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Esperto",
};

const dayFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
});

function DiscoveryCard({ trip, currentUserId }: { trip: FishingTripDiscovery; currentUserId: string }) {
  const startsAt = new Date(trip.startsAt);
  const endsAt = new Date(trip.endsAt);
  const ownTrip = trip.organizerUserId === currentUserId;

  return (
    <article className="discovery-card">
      <div className="trip-card-heading">
        <span className="trip-status">{trip.techniqueName}</span>
        <span className="trip-privacy">
          {trip.tripType === "protected" ? "Spot protetto" : "Uscita libera"}
        </span>
      </div>
      <h2>{trip.title}</h2>
      <p className="discovery-date">
        {dayFormatter.format(startsAt)} · {timeFormatter.format(startsAt)}–{timeFormatter.format(endsAt)}
      </p>
      <p className="discovery-zone">{trip.publicZone} · {trip.provinceName}</p>
      <p className="discovery-description">{trip.description}</p>
      <div className="discovery-facts" aria-label="Dettagli dell’uscita">
        <span>{trip.waterType === "sea" ? "Mare" : "Acqua dolce"}</span>
        <span>{LEVEL_LABELS[trip.recommendedLevel]}</span>
        <span>{trip.availablePlaces} {trip.availablePlaces === 1 ? "posto" : "posti"} disponibili</span>
      </div>
      <div className="discovery-organizer">
        <span>Organizza <strong>{ownTrip ? "tu" : trip.organizerName}</strong></span>
        {ownTrip && <span className="own-trip-badge">La tua uscita</span>}
      </div>
    </article>
  );
}

export function TripDiscoveryPage() {
  const { user } = useAuth();
  const [techniques, setTechniques] = useState<CatalogItem[]>([]);
  const [filters, setFilters] = useState<TripDiscoveryFilters>({ ...EMPTY_TRIP_DISCOVERY_FILTERS });
  const [trips, setTrips] = useState<FishingTripDiscovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadFishingTechniques(),
      loadDiscoverableTrips(EMPTY_TRIP_DISCOVERY_FILTERS),
    ])
      .then(([loadedTechniques, loadedTrips]) => {
        if (!active) return;
        setTechniques(loadedTechniques);
        setTrips(loadedTrips);
      })
      .catch((caught) => {
        if (active) setError(readableError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  async function search(nextFilters: TripDiscoveryFilters) {
    setSearching(true);
    setError(null);
    try {
      setTrips(await loadDiscoverableTrips(nextFilters));
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSearching(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void search(filters);
  }

  function resetFilters() {
    const empty = { ...EMPTY_TRIP_DISCOVERY_FILTERS };
    setFilters(empty);
    void search(empty);
  }

  if (loading) return <div className="page-status">Cerco le prossime uscite…</div>;

  return (
    <section className="page-wide discovery-page">
      <div className="discovery-heading">
        <div>
          <div className="eyebrow">Beta Lazio</div>
          <h1>Trova un’uscita</h1>
          <p>Scopri chi va a pesca, scegli la proposta giusta e organizza il prossimo incontro.</p>
        </div>
        <span className="result-count">{trips.length} {trips.length === 1 ? "uscita" : "uscite"}</span>
      </div>

      <form className="discovery-filters" onSubmit={submit}>
        <label>
          Provincia
          <select value={filters.provinceCode} onChange={(event) => setFilters((current) => ({ ...current, provinceCode: event.target.value }))}>
            <option value="">Tutto il Lazio</option>
            {LAZIO_PROVINCES.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
          </select>
        </label>
        <label>
          Tecnica
          <select value={filters.techniqueId} onChange={(event) => setFilters((current) => ({ ...current, techniqueId: event.target.value ? Number(event.target.value) : "" }))}>
            <option value="">Tutte le tecniche</option>
            {techniques.map((technique) => <option key={technique.id} value={technique.id}>{technique.label}</option>)}
          </select>
        </label>
        <label>
          Tipo d’acqua
          <select value={filters.waterType} onChange={(event) => setFilters((current) => ({ ...current, waterType: event.target.value as TripDiscoveryFilters["waterType"] }))}>
            <option value="">Mare e acqua dolce</option>
            <option value="sea">Mare</option>
            <option value="freshwater">Acqua dolce</option>
          </select>
        </label>
        <label>
          Data
          <input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
        </label>
        <div className="filter-actions">
          <button className="button button-primary" disabled={searching} type="submit">
            {searching ? "Ricerca…" : "Applica filtri"}
          </button>
          <button className="button button-secondary" disabled={searching} type="button" onClick={resetFilters}>Azzera</button>
        </div>
      </form>

      <Notice kind="info">Per le uscite protette mostriamo soltanto la zona generica. Lo spot preciso resta riservato.</Notice>
      {error && <Notice kind="error">{error}</Notice>}

      {!error && trips.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">≈</span>
          <h2>Nessuna uscita con questi filtri</h2>
          <p>Prova ad ampliare la ricerca o torna a controllare presto.</p>
          <button className="button button-secondary" type="button" onClick={resetFilters}>Mostra tutto il Lazio</button>
        </div>
      ) : (
        <div className={`discovery-grid${searching ? " is-searching" : ""}`} aria-live="polite">
          {trips.map((trip) => <DiscoveryCard key={trip.id} trip={trip} currentUserId={user?.id ?? ""} />)}
        </div>
      )}
    </section>
  );
}
