import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { formatTripSchedule } from "../lib/tripExperience";
import {
  cancelTripParticipation,
  loadDiscoverableTrips,
  loadFishingTechniques,
  MAX_REQUEST_MESSAGE_LENGTH,
  requestTripParticipation,
} from "../lib/trips";
import {
  EMPTY_TRIP_DISCOVERY_FILTERS,
  LAZIO_PROVINCES,
  type CatalogItem,
  type FishingTripDiscovery,
  type RecommendedLevel,
  type TripDiscoveryFilters,
  type TripParticipationStatus,
} from "../types/domain";

const LEVEL_LABELS: Record<RecommendedLevel, string> = {
  any: "Tutti i livelli",
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Esperto",
};

const PARTICIPATION_LABELS: Record<TripParticipationStatus, string> = {
  requested: "Richiesta inviata",
  accepted: "Richiesta accettata",
  rejected: "Richiesta rifiutata",
  cancelled: "Richiesta annullata",
  confirmed: "Partecipazione confermata",
  completed: "Uscita completata",
  no_show: "Assenza registrata",
};

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DiscoveryCard({
  trip,
  currentUserId,
  busy,
  onRequest,
  onCancel,
}: {
  trip: FishingTripDiscovery;
  currentUserId: string;
  busy: boolean;
  onRequest: (tripId: string, message: string) => Promise<void>;
  onCancel: (tripId: string) => void;
}) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const ownTrip = trip.organizerUserId === currentUserId;

  function openRequestForm() {
    setRequestMessage("");
    setShowRequestForm(true);
  }

  return (
    <article className="discovery-card">
      <div className="trip-card-heading">
        <span className="trip-status">{trip.techniqueName}</span>
        <span className="trip-privacy">
          {trip.tripType === "protected" ? "Spot protetto" : "Uscita libera"}
        </span>
      </div>
      <span className="trip-code">{trip.publicCode}</span>
      <h2>{trip.title}</h2>
      <p className="discovery-date">{formatTripSchedule(trip.startsAt, trip.endsAt, trip.endPrecision)}</p>
      <p className="discovery-zone">{trip.publicZone} · {trip.provinceName}</p>
      {trip.description && <p className="discovery-description">{trip.description}</p>}
      <div className="discovery-facts" aria-label="Dettagli dell’uscita">
        <span>{trip.waterType === "sea" ? "Mare" : "Acqua dolce"}</span>
        <span>{LEVEL_LABELS[trip.recommendedLevel]}</span>
        <span>{trip.participantCount}/{trip.maxParticipants} nel gruppo</span>
        <span>{trip.availablePlaces} {trip.availablePlaces === 1 ? "posto" : "posti"} disponibili</span>
      </div>
      <div className="discovery-organizer">
        {trip.organizerPhotoUrl ? (
          <img src={trip.organizerPhotoUrl} alt={`Foto di ${trip.organizerName}`} />
        ) : (
          <span className="organizer-avatar-fallback" aria-hidden="true">
            {trip.organizerName.charAt(0).toUpperCase()}
          </span>
        )}
        <span>Organizza <strong>{ownTrip ? "tu" : trip.organizerName}</strong></span>
        {ownTrip && <span className="own-trip-badge">La tua uscita</span>}
      </div>
      <div className="discovery-actions" aria-live="polite">
        {ownTrip ? (
          <Link className="button button-secondary" to={`/uscite/${trip.id}`}>Gestisci la tua uscita</Link>
        ) : trip.participationStatus === "requested" ? (
          <>
            <span className="participation-state state-requested">{PARTICIPATION_LABELS.requested}</span>
            <button className="button button-secondary" disabled={busy} type="button" onClick={() => onCancel(trip.id)}>
              {busy ? "Aggiornamento…" : "Annulla richiesta"}
            </button>
          </>
        ) : trip.participationStatus === "cancelled" ? (
          <>
            <span className="participation-state">{PARTICIPATION_LABELS.cancelled}</span>
            <button className="button button-primary" disabled={busy} type="button" onClick={openRequestForm}>
              {busy ? "Invio…" : "Invia di nuovo"}
            </button>
          </>
        ) : trip.participationStatus ? (
          <span className={`participation-state state-${trip.participationStatus}`}>
            {PARTICIPATION_LABELS[trip.participationStatus]}
          </span>
        ) : (
          <button className="button button-primary" disabled={busy} type="button" onClick={openRequestForm}>
            {busy ? "Invio…" : "Chiedi di partecipare"}
          </button>
        )}
      </div>
      {showRequestForm && [null, "cancelled"].includes(trip.participationStatus) && (
        <form
          className="request-message-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onRequest(trip.id, requestMessage);
          }}
        >
          <label htmlFor={`request-message-${trip.id}`}>
            Messaggio per l’organizzatore <span className="optional">opzionale</span>
          </label>
          <textarea
            id={`request-message-${trip.id}`}
            maxLength={MAX_REQUEST_MESSAGE_LENGTH}
            placeholder="Es. Pesco spesso in zona e ho macchina e waders."
            rows={3}
            value={requestMessage}
            onChange={(event) => setRequestMessage(event.target.value)}
          />
          <div className="request-message-form-footer">
            <span>{requestMessage.length}/{MAX_REQUEST_MESSAGE_LENGTH}</span>
            <div className="inline-actions">
              <button className="button button-primary" disabled={busy} type="submit">
                {busy ? "Invio…" : "Invia richiesta"}
              </button>
              <button className="button button-secondary" disabled={busy} type="button" onClick={() => setShowRequestForm(false)}>
                Annulla
              </button>
            </div>
          </div>
        </form>
      )}
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
  const [actionTripId, setActionTripId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void Promise.all([
      loadFishingTechniques(),
      loadDiscoverableTrips(EMPTY_TRIP_DISCOVERY_FILTERS, user.id),
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
  }, [user]);

  async function search(nextFilters: TripDiscoveryFilters) {
    if (!user) return;
    setSearching(true);
    setError(null);
    try {
      setTrips(await loadDiscoverableTrips(nextFilters, user.id));
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSearching(false);
    }
  }

  function updateParticipationStatus(tripId: string, status: TripParticipationStatus) {
    setTrips((current) => current.map((trip) => (
      trip.id === tripId ? { ...trip, participationStatus: status } : trip
    )));
  }

  async function requestParticipation(tripId: string, requestMessage: string) {
    setActionTripId(tripId);
    setError(null);
    setNotice(null);
    try {
      const status = await requestTripParticipation(tripId, requestMessage);
      updateParticipationStatus(tripId, status);
      setNotice("Richiesta inviata. Lo stato è visibile direttamente sulla card dell’uscita.");
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setActionTripId(null);
    }
  }

  async function cancelParticipation(tripId: string) {
    setActionTripId(tripId);
    setError(null);
    setNotice(null);
    try {
      const status = await cancelTripParticipation(tripId);
      updateParticipationStatus(tripId, status);
      setNotice("Richiesta annullata. Puoi inviarla di nuovo finché l’uscita resta disponibile.");
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setActionTripId(null);
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
          Zona
          <input
            maxLength={80}
            placeholder="Es. Ostia, Bracciano"
            type="search"
            value={filters.zone}
            onChange={(event) => setFilters((current) => ({ ...current, zone: event.target.value }))}
          />
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
          <input min={localDateValue()} type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
        </label>
        <div className="filter-actions">
          <button className="button button-primary" disabled={searching} type="submit">
            {searching ? "Ricerca…" : "Applica filtri"}
          </button>
          <button className="button button-secondary" disabled={searching} type="button" onClick={resetFilters}>Azzera</button>
        </div>
      </form>

      <Notice kind="info">Per le uscite protette mostriamo soltanto la zona generica. Lo spot preciso resta riservato.</Notice>
      {notice && <Notice kind="success">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      {!error && trips.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">≈</span>
          <h2>Nessuna uscita con questi filtri</h2>
          <p>Non trovi quella giusta? Proponi tu la prossima uscita e condividila con altri pescatori.</p>
          <div className="empty-state-actions">
            <Link className="button button-primary" to="/crea-uscita">Proponi un’uscita</Link>
            <button className="button button-secondary" type="button" onClick={resetFilters}>Mostra tutto il Lazio</button>
          </div>
        </div>
      ) : (
        <div className={`discovery-grid${searching ? " is-searching" : ""}`} aria-live="polite">
          {trips.map((trip) => (
            <DiscoveryCard
              key={trip.id}
              trip={trip}
              currentUserId={user?.id ?? ""}
              busy={actionTripId === trip.id}
              onRequest={requestParticipation}
              onCancel={(tripId) => void cancelParticipation(tripId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
