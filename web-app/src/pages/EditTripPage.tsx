import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Notice } from "../components/Notice";
import { TripForm } from "../components/TripForm";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { loadFishingTechniques, loadFishingTrip, tripToValues, updateFishingTrip } from "../lib/trips";
import { hasErrors, validateTrip } from "../lib/validation";
import { EMPTY_TRIP } from "../types/domain";
import type { CatalogItem, FieldErrors, FishingTrip, TripValues } from "../types/domain";

export function EditTripPage() {
  const { user } = useAuth();
  const { tripId = "" } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<FishingTrip | null>(null);
  const [values, setValues] = useState<TripValues>(EMPTY_TRIP);
  const [techniques, setTechniques] = useState<CatalogItem[]>([]);
  const [errors, setErrors] = useState<FieldErrors<TripValues>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !tripId) return;
    let active = true;

    void Promise.all([loadFishingTechniques(), loadFishingTrip(user.id, tripId)])
      .then(([catalog, loadedTrip]) => {
        if (!active) return;
        setTechniques(catalog);
        setTrip(loadedTrip);
        setValues(tripToValues(loadedTrip));
      })
      .catch((caught) => {
        if (active) setNotice(readableError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [tripId, user]);

  function changeValues(nextValues: TripValues) {
    setValues(nextValues);
    setErrors((current) => {
      const nextErrors = { ...current };
      for (const key of Object.keys(nextErrors) as Array<keyof TripValues>) {
        if (nextValues[key] !== values[key]) nextErrors[key] = undefined;
      }
      return nextErrors;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !trip) return;

    const nextErrors = validateTrip(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      setNotice("Controlla i campi evidenziati.");
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      await updateFishingTrip(user.id, trip.id, values);
      navigate(`/uscite/${trip.id}`, {
        replace: true,
        state: { notice: "Modifiche salvate." },
      });
    } catch (caught) {
      setNotice(readableError(caught));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-status">Preparazione della modifica…</div>;

  if (!trip) {
    return (
      <section className="page-narrow auth-card center-card">
        <h1>Uscita non disponibile</h1>
        {notice && <Notice kind="error">{notice}</Notice>}
        <Link className="button button-secondary" to="/mie-uscite">Torna alle mie uscite</Link>
      </section>
    );
  }

  const canEdit = trip.status === "open" && new Date(trip.startsAt).getTime() > Date.now();
  if (!canEdit) {
    return (
      <section className="page-narrow auth-card center-card">
        <h1>Uscita non modificabile</h1>
        <Notice kind="info">Puoi modificare soltanto un’uscita aperta che deve ancora iniziare.</Notice>
        <Link className="button button-secondary" to={`/uscite/${trip.id}`}>Torna al dettaglio</Link>
      </section>
    );
  }

  return (
    <section className="page-wide">
      <Link className="back-link" to={`/uscite/${trip.id}`}>← Torna al dettaglio</Link>
      <div className="profile-heading">
        <div>
          <div className="eyebrow">Gestisci uscita</div>
          <h1>Modifica la proposta</h1>
          <p>Aggiorna solo ciò che serve. Lo spot protetto resta separato dai dati pubblici.</p>
        </div>
      </div>

      {notice && <Notice kind="error">{notice}</Notice>}

      <TripForm
        values={values}
        techniques={techniques}
        errors={errors}
        saving={saving}
        submitLabel="Salva modifiche"
        savingLabel="Salvataggio…"
        onChange={changeValues}
        onSubmit={(event) => void submit(event)}
      />
    </section>
  );
}
