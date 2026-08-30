import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Notice } from "../components/Notice";
import { TripForm } from "../components/TripForm";
import { TripShareActions } from "../components/TripShareActions";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { loadProfile } from "../lib/profile";
import { createFishingTrip, loadFishingTechniques } from "../lib/trips";
import { hasErrors, tripDateTimes, validateTrip } from "../lib/validation";
import { EMPTY_TRIP } from "../types/domain";
import type { CatalogItem, FieldErrors, TripValues } from "../types/domain";

export function CreateTripPage() {
  const { user } = useAuth();
  const [values, setValues] = useState<TripValues>(EMPTY_TRIP);
  const [techniques, setTechniques] = useState<CatalogItem[]>([]);
  const [errors, setErrors] = useState<FieldErrors<TripValues>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [createdTrip, setCreatedTrip] = useState<{ id: string; publicCode: string } | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    void Promise.all([loadFishingTechniques(), loadProfile(user.id)])
      .then(([catalog, profile]) => {
        if (!active) return;
        setTechniques(catalog);
        setProfileReady(Boolean(profile.completedAt));
        setValues((current) => ({
          ...current,
          provinceCode: profile.values.provinceCode || current.provinceCode,
          waterType: profile.values.waterType === "both" ? "" : profile.values.waterType,
        }));
      })
      .catch((caught) => active && setNotice({ kind: "error", text: readableError(caught) }))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [user]);

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
    if (!user || !profileReady) return;

    const nextErrors = validateTrip(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      setNotice({ kind: "error", text: "Controlla i campi evidenziati." });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const created = await createFishingTrip(user.id, values);
      setCreatedTrip(created);
      setNotice({ kind: "success", text: "Uscita pubblicata. Condividila per trovare i primi compagni di pesca." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setNotice({ kind: "error", text: readableError(caught) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-status">Preparazione del modulo…</div>;

  if (!profileReady) {
    return (
      <section className="page-narrow auth-card center-card">
        <div className="eyebrow">Prima il profilo</div>
        <h1>Completa il profilo pescatore</h1>
        <p>Per proporre un’uscita servono almeno tecnica, livello e disponibilità.</p>
        {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
        <Link className="button button-primary" to="/profilo">Completa il profilo</Link>
      </section>
    );
  }

  if (createdTrip) {
    const createdTimes = tripDateTimes(values);
    const techniqueName = techniques.find((item) => item.id === values.techniqueId)?.label
      ?? "Pesca";
    return (
      <section className="page-narrow auth-card center-card">
        <div className="success-mark" aria-hidden="true">✓</div>
        <h1>Uscita creata</h1>
        {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
        <p>I dettagli precisi di un’uscita protetta non sono salvati nella parte pubblica.</p>
        {createdTimes && (
          <section className="post-create-share">
            <h2>Condividi l’uscita</h2>
            <p>Invia il link pubblico: funziona anche per chi non ha ancora un account.</p>
            <TripShareActions data={{
              tripId: createdTrip.id,
              publicCode: createdTrip.publicCode,
              title: values.title,
              techniqueName,
              publicZone: values.publicZone,
              startsAt: createdTimes.startsAt.toISOString(),
              endsAt: createdTimes.endsAt.toISOString(),
              endPrecision: createdTimes.endPrecision,
              availablePlaces: Math.max(values.maxParticipants - 1, 0),
              tripType: values.tripType,
            }} />
          </section>
        )}
        <div className="button-stack">
          <Link className="button button-secondary" to={`/uscite/${createdTrip.id}`}>Vedi l’uscita</Link>
          <Link className="button button-secondary" to="/mie-uscite">Le mie uscite</Link>
          <button className="button button-secondary" type="button" onClick={() => {
            setValues({ ...EMPTY_TRIP });
            setCreatedTrip(null);
            setNotice(null);
          }}>Crea un’altra uscita</button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-wide">
      <div className="profile-heading">
        <div>
          <div className="eyebrow">Proponi un’uscita</div>
          <h1>Andiamo a pesca?</h1>
          <p>Poche informazioni chiare. Dopo la pubblicazione potrai rivedere e gestire l’uscita.</p>
        </div>
        <span className="completion-badge">Circa 2 minuti</span>
      </div>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <TripForm
        values={values}
        techniques={techniques}
        errors={errors}
        saving={saving}
        submitLabel="Pubblica l’uscita"
        savingLabel="Pubblicazione…"
        onChange={changeValues}
        onSubmit={(event) => void submit(event)}
      />
    </section>
  );
}
