import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PublicTripAction } from "../../app/u/[tripId]/PublicTripAction";
import { Notice } from "../components/Notice";
import { readableError } from "../lib/errors";
import { canRequestPublicTrip, publicTripPhase, type PublicFishingTrip } from "../lib/publicTrip";
import { requireSupabase } from "../lib/supabase";
import { formatTripSchedule } from "../lib/tripExperience";
import { loadTripPreview, tripPreviewPath } from "../lib/tripPreview";

const PHASE_LABELS = { open: "Uscita aperta", full: "Posti esauriti", confirmed: "Uscita confermata", cancelled: "Uscita annullata", completed: "Uscita conclusa" };
const LEVEL_LABELS = { any: "Qualsiasi livello", beginner: "Principiante", intermediate: "Intermedio", expert: "Esperto" };

export function TripPreviewPage() {
  const { tripId = "" } = useParams();
  const [trip, setTrip] = useState<PublicFishingTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void loadTripPreview(tripId)
      .then((loaded) => { if (active) setTrip(loaded); })
      .catch((caught) => { if (active) setError(readableError(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tripId]);

  if (loading) return <div className="page-status">Caricamento dell’uscita…</div>;
  return (
    <section className="page-wide trip-detail-page">
      <Link className="back-link" to="/mie-uscite">← Le mie uscite</Link>
      {!trip ? <>
        <h1>Uscita non disponibile</h1>
        <Notice kind={error ? "error" : "info"}>{error ?? "L’uscita non è più disponibile nella ricerca."}</Notice>
        <Link className="button button-secondary" to="/trova-uscita">Trova un’uscita</Link>
      </> : <>
        <div className="trip-detail-hero">
          <div>
            <div className="trip-card-heading">
              <span className={`trip-status status-${trip.status}`}>{PHASE_LABELS[publicTripPhase(trip)]}</span>
              <span className="trip-privacy">{trip.tripType === "protected" ? "Spot protetto" : "Uscita libera"}</span>
            </div>
            <span className="trip-code">{trip.publicCode}</span>
            <h1>{trip.title}</h1>
            <p>{formatTripSchedule(trip.startsAt, trip.endsAt, trip.endPrecision)}</p>
            <dl className="trip-data-list trip-hero-facts" aria-label="Informazioni pubbliche dell’uscita">
              <div><dt>Tecnica</dt><dd>{trip.techniqueName}</dd></div>
              <div><dt>Acqua</dt><dd>{trip.waterType === "sea" ? "Mare" : "Acqua dolce"}</dd></div>
              <div><dt>Zona</dt><dd>{trip.publicZone} · {trip.provinceCode}</dd></div>
              <div><dt>Livello</dt><dd>{LEVEL_LABELS[trip.recommendedLevel]}</dd></div>
              <div><dt>Partecipanti totali</dt><dd>{trip.maxParticipants}, organizzatore incluso</dd></div>
              {trip.availablePlaces !== null && <div><dt>Posti disponibili</dt><dd>{trip.availablePlaces}</dd></div>}
            </dl>
          </div>
        </div>
        <section className="trip-detail-card">
          <h2>La tua partecipazione</h2>
          <PublicTripAction tripId={trip.id} clientOverride={requireSupabase()}
            returnPath={tripPreviewPath(trip.id)} canRequest={canRequestPublicTrip(trip)} />
        </section>
        {trip.description && <section className="trip-detail-card trip-useful-info">
          <h2>Informazioni utili</h2><p className="preserve-lines">{trip.description}</p>
        </section>}
        {trip.tripType === "protected" ? (
          <Notice kind="info">Lo spot preciso e le indicazioni private restano riservati fino alla conferma.</Notice>
        ) : trip.publicMeetingPoint && <section className="trip-detail-card trip-useful-info">
          <h2>Indicazioni pubbliche</h2><p className="preserve-lines">{trip.publicMeetingPoint}</p>
        </section>}
      </>}
    </section>
  );
}
