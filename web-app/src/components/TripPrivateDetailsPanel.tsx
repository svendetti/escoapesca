import { type FormEvent, useEffect, useState } from "react";
import { Notice } from "./Notice";
import { readableError } from "../lib/errors";
import { privateDetailsUnavailableMessage } from "../lib/participationProgress";
import {
  loadTripPrivateDetails,
  privateDetailsToValues,
  saveTripPrivateDetails,
} from "../lib/trips";
import { hasErrors, validateTripPrivateDetails } from "../lib/validation";
import {
  EMPTY_TRIP_PRIVATE_DETAILS,
  type FieldErrors,
  type FishingTrip,
  type TripPrivateDetails,
  type TripPrivateDetailsValues,
  type TripParticipationStatus,
} from "../types/domain";

type Props = {
  trip: FishingTrip;
  isOrganizer: boolean;
  participationStatus: TripParticipationStatus | null;
};

export function TripPrivateDetailsPanel({ trip, isOrganizer, participationStatus }: Props) {
  const [details, setDetails] = useState<TripPrivateDetails | null>(null);
  const [values, setValues] = useState<TripPrivateDetailsValues>({
    ...EMPTY_TRIP_PRIVATE_DETAILS,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TripPrivateDetailsValues>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadTripPrivateDetails(trip.id)
      .then((loaded) => {
        if (!active) return;
        setDetails(loaded);
        setValues(privateDetailsToValues(loaded));
      })
      .catch((caught) => {
        if (active) setError(readableError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [trip.id]);

  const canEdit = isOrganizer
    && (trip.status === "open" || trip.status === "confirmed")
    && new Date(trip.startsAt).getTime() > Date.now();

  function change<K extends keyof TripPrivateDetailsValues>(
    key: K,
    value: TripPrivateDetailsValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateTripPrivateDetails(values);
    setFieldErrors(nextErrors);
    setNotice(null);
    setError(null);
    if (hasErrors(nextErrors)) {
      setError("Controlla i campi evidenziati.");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveTripPrivateDetails(trip.id, values);
      setDetails(saved);
      setValues(privateDetailsToValues(saved));
      setNotice(trip.status === "confirmed"
        ? "Dettagli salvati e disponibili ai partecipanti confermati."
        : "Dettagli salvati. Diventeranno visibili ai partecipanti dopo la conferma dell’uscita.");
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="private-details-card"><p>Caricamento dettagli riservati…</p></section>;
  }

  if (!isOrganizer) {
    return (
      <section className="private-details-card" aria-labelledby="private-details-title">
        <div className="eyebrow">Solo partecipanti confermati</div>
        <h2 id="private-details-title">Punto d’incontro</h2>
        {error && <Notice kind="error">{error}</Notice>}
        {!error && !details ? (
          <Notice kind="info">
            {privateDetailsUnavailableMessage(participationStatus, trip.status)}
          </Notice>
        ) : details ? (
          <div className="private-details-content">
            <p className="private-meeting-point preserve-lines">{details.meetingPointText}</p>
            {details.exactLat !== null && details.exactLon !== null && (
              <div className="private-coordinates">
                <span>Coordinate precise</span>
                <strong>{details.exactLat}, {details.exactLon}</strong>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${details.exactLat},${details.exactLon}`)}`}
                  rel="noreferrer"
                  target="_blank"
                >Apri nella mappa</a>
              </div>
            )}
            {details.privateNotes && (
              <div>
                <h3>Informazioni organizzative</h3>
                <p className="preserve-lines">{details.privateNotes}</p>
              </div>
            )}
            <p className="privacy-reminder">Non condividere pubblicamente queste informazioni: possono includere uno spot protetto.</p>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="private-details-card" aria-labelledby="private-details-title">
      <div className="eyebrow">Area riservata</div>
      <h2 id="private-details-title">Punto d’incontro e indicazioni private</h2>
      <p>
        Queste informazioni non compaiono nella ricerca pubblica.
        {trip.status === "open"
          ? " Puoi prepararle ora: saranno leggibili soltanto dopo la conferma."
          : " Sono leggibili soltanto dai partecipanti confermati."}
      </p>
      {notice && <Notice kind="success">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      {canEdit ? (
        <form className="private-details-form" onSubmit={(event) => void submit(event)}>
          <label>
            Punto d’incontro
            <textarea
              autoComplete="off"
              maxLength={500}
              placeholder="Es. Parcheggio davanti all’ingresso del porto"
              rows={3}
              value={values.meetingPointText}
              onChange={(event) => change("meetingPointText", event.target.value)}
            />
            {fieldErrors.meetingPointText && <span className="field-error">{fieldErrors.meetingPointText}</span>}
          </label>
          <div className="form-grid">
            <label>
              Latitudine <span className="optional">opzionale</span>
              <input
                inputMode="decimal"
                placeholder="41.7502"
                value={values.exactLat}
                onChange={(event) => change("exactLat", event.target.value)}
              />
              {fieldErrors.exactLat && <span className="field-error">{fieldErrors.exactLat}</span>}
            </label>
            <label>
              Longitudine <span className="optional">opzionale</span>
              <input
                inputMode="decimal"
                placeholder="12.2871"
                value={values.exactLon}
                onChange={(event) => change("exactLon", event.target.value)}
              />
              {fieldErrors.exactLon && <span className="field-error">{fieldErrors.exactLon}</span>}
            </label>
          </div>
          <label>
            Informazioni organizzative <span className="optional">opzionale</span>
            <textarea
              maxLength={2000}
              placeholder="Accesso, abbigliamento, riferimenti utili…"
              rows={4}
              value={values.privateNotes}
              onChange={(event) => change("privateNotes", event.target.value)}
            />
            {fieldErrors.privateNotes && <span className="field-error">{fieldErrors.privateNotes}</span>}
          </label>
          <button className="button button-primary" disabled={saving} type="submit">
            {saving ? "Salvataggio…" : details ? "Aggiorna dettagli riservati" : "Salva dettagli riservati"}
          </button>
        </form>
      ) : details ? (
        <div className="private-details-content">
          <p className="private-meeting-point preserve-lines">{details.meetingPointText}</p>
          {details.exactLat !== null && details.exactLon !== null && (
            <p><strong>Coordinate:</strong> {details.exactLat}, {details.exactLon}</p>
          )}
          {details.privateNotes && <p className="preserve-lines">{details.privateNotes}</p>}
        </div>
      ) : (
        <Notice kind="info">I dettagli riservati non sono stati inseriti.</Notice>
      )}
    </section>
  );
}
