import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import {
  loadMyTripFeedback,
  submitTripFeedback,
  validateTripFeedback,
  type TripFeedback,
  type TripFeedbackValues,
} from "../lib/feedback";
import { readableError } from "../lib/errors";
import { loadFishingTripForViewer } from "../lib/trips";
import type { FishingTrip } from "../types/domain";

const initialValues: TripFeedbackValues = {
  tripHappened: null,
  metNewFisher: null,
  wouldRepeat: null,
  rating: 0,
  comment: "",
};

function YesNoChoice({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="chip-grid">
      {[
        { label: "Sì", option: true },
        { label: "No", option: false },
      ].map(({ label, option }) => (
        <label className={`choice-chip ${value === option ? "selected" : ""}`} key={label}>
          <input
            checked={value === option}
            name={name}
            onChange={() => onChange(option)}
            type="radio"
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

export function TripFeedbackPage() {
  const { user } = useAuth();
  const { tripId = "" } = useParams();
  const [trip, setTrip] = useState<FishingTrip | null>(null);
  const [feedback, setFeedback] = useState<TripFeedback | null>(null);
  const [values, setValues] = useState<TripFeedbackValues>(initialValues);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !tripId) return;
    let active = true;

    void Promise.all([loadFishingTripForViewer(tripId), loadMyTripFeedback()])
      .then(([loadedTrip, loadedFeedback]) => {
        if (!active) return;
        setTrip(loadedTrip);
        setFeedback(loadedFeedback.find((item) => item.tripId === tripId) ?? null);
      })
      .catch((caught) => {
        if (active) setError(readableError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [tripId, user]);

  function update<K extends keyof TripFeedbackValues>(key: K, value: TripFeedbackValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateTripFeedback(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const saved = await submitTripFeedback(tripId, values);
      setFeedback(saved);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-status">Caricamento del feedback…</div>;

  if (!trip) {
    return (
      <section className="page-narrow auth-card center-card">
        <h1>Feedback non disponibile</h1>
        <Notice kind="error">{error ?? "Uscita non trovata o non accessibile."}</Notice>
        <Link className="button button-secondary" to="/mie-uscite">Torna alle mie uscite</Link>
      </section>
    );
  }

  const hasEnded = new Date(trip.endsAt).getTime() <= Date.now();
  const eligibleStatus = ["confirmed", "completed"].includes(trip.status);

  if (feedback) {
    return (
      <section className="page-narrow auth-card center-card">
        <div className="eyebrow">Feedback ricevuto</div>
        <h1>Grazie per averci aiutato</h1>
        <Notice kind="success">Il feedback per “{trip.title}” è stato registrato.</Notice>
        <p>Questa risposta resta privata e serve a misurare quante uscite reali nascono grazie a EscoAPesca.</p>
        <p><strong>Valutazione:</strong> {feedback.rating}/5</p>
        <Link className="button button-primary" to="/mie-uscite">Torna alle mie uscite</Link>
      </section>
    );
  }

  if (!hasEnded || !eligibleStatus) {
    return (
      <section className="page-narrow auth-card center-card">
        <h1>Feedback non ancora disponibile</h1>
        <Notice kind="info">
          {!hasEnded
            ? "Potrai rispondere dopo l’orario previsto di fine uscita."
            : "Il feedback è disponibile solo per le uscite confermate."}
        </Notice>
        <Link className="button button-secondary" to={`/uscite/${trip.id}`}>Torna all’uscita</Link>
      </section>
    );
  }

  return (
    <section className="page-narrow profile-page">
      <Link className="back-link" to="/mie-uscite">← Le mie uscite</Link>
      <div className="profile-heading">
        <div>
          <div className="eyebrow">Dopo l’uscita</div>
          <h1>Com’è andata?</h1>
          <p>“{trip.title}” · Le risposte restano private e servono a validare la Beta.</p>
        </div>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      <form className="profile-form" onSubmit={(event) => void handleSubmit(event)}>
        <fieldset>
          <legend>L’uscita si è realmente svolta?</legend>
          <YesNoChoice
            name="trip-happened"
            value={values.tripHappened}
            onChange={(value) => setValues((current) => ({
              ...current,
              tripHappened: value,
              metNewFisher: value ? null : false,
              wouldRepeat: value ? null : false,
            }))}
          />
        </fieldset>

        {values.tripHappened && (
          <>
            <fieldset>
              <legend>Hai pescato con almeno una persona conosciuta tramite EscoAPesca?</legend>
              <YesNoChoice name="met-new-fisher" value={values.metNewFisher} onChange={(value) => update("metNewFisher", value)} />
            </fieldset>

            <fieldset>
              <legend>Andresti nuovamente a pesca con questa persona o gruppo?</legend>
              <YesNoChoice name="would-repeat" value={values.wouldRepeat} onChange={(value) => update("wouldRepeat", value)} />
            </fieldset>
          </>
        )}

        <fieldset>
          <legend>Valutazione complessiva dell’organizzazione</legend>
          <div className="chip-grid">
            {[1, 2, 3, 4, 5].map((rating) => (
              <label className={`choice-chip ${values.rating === rating ? "selected" : ""}`} key={rating}>
                <input
                  checked={values.rating === rating}
                  name="rating"
                  onChange={() => update("rating", rating)}
                  type="radio"
                />
                <span>{rating} ★</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Commento <span className="optional">opzionale</span></legend>
          <label>
            Massimo 1000 caratteri
            <textarea
              maxLength={1000}
              onChange={(event) => update("comment", event.target.value)}
              placeholder="Cosa ha funzionato o cosa possiamo migliorare?"
              rows={5}
              value={values.comment}
            />
          </label>
        </fieldset>

        <Notice kind="info">Dopo l’invio il feedback non sarà modificabile.</Notice>
        <div className="sticky-save">
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? "Invio in corso…" : "Invia feedback"}
          </button>
        </div>
      </form>
    </section>
  );
}
