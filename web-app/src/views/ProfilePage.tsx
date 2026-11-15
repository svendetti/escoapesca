import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FormError } from "../components/FormError";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import {
  consumeReturnPath,
  normalizeInternalReturnPath,
  peekReturnPath,
  rememberReturnPath,
} from "../lib/returnPath";
import {
  downloadProfilePhoto,
  loadCatalogs,
  loadProfile,
  saveProfile,
  uploadProfilePhoto,
} from "../lib/profile";
import { hasErrors, validateProfile, validateProfilePhoto } from "../lib/validation";
import { AGE_BANDS, EMPTY_PROFILE, LAZIO_PROVINCES } from "../types/domain";
import type { CatalogItem, FieldErrors, ProfileValues } from "../types/domain";

export function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = user?.id ?? null;
  const requestedReturnPath = normalizeInternalReturnPath(
    new URLSearchParams(location.search).get("returnTo"),
  ) ?? peekReturnPath();
  if (requestedReturnPath) rememberReturnPath(requestedReturnPath);
  const [values, setValues] = useState<ProfileValues>(EMPTY_PROFILE);
  const [techniques, setTechniques] = useState<CatalogItem[]>([]);
  const [availability, setAvailability] = useState<CatalogItem[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors<ProfileValues>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "success" | "info"; text: string } | null>(null);

  const completionCount = useMemo(() => [
    values.waterType,
    values.skillLevel,
    values.techniqueIds.length > 0,
    values.availabilitySlotIds.length > 0,
  ].filter(Boolean).length, [values]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setNotice(null);
    try {
      const [catalogs, profile] = await Promise.all([loadCatalogs(), loadProfile(userId)]);
      setTechniques(catalogs.techniques);
      setAvailability(catalogs.availability);
      setValues(profile.values);
      setCompletedAt(profile.completedAt);
      if (profile.photoKey) {
        const url = await downloadProfilePhoto(profile.photoKey);
        setPhotoUrl(url);
      }
    } catch (caught) {
      setNotice({ kind: "error", text: readableError(caught) });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function updateText(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function toggleId(field: "techniqueIds" | "availabilitySlotIds", id: number) {
    setValues((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((currentId) => currentId !== id)
        : [...current[field], id],
    }));
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return setPhotoFile(null);
    const error = validateProfilePhoto(file);
    if (error) {
      setNotice({ kind: "error", text: error });
      event.target.value = "";
      return;
    }
    setNotice(null);
    setPhotoFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const nextErrors = validateProfile(values);
    setErrors(nextErrors);
    setNotice(null);
    if (hasErrors(nextErrors)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    try {
      const completingForFirstTime = !completedAt;
      await saveProfile(values);
      if (photoFile) {
        const photoKey = await uploadProfilePhoto(user.id, photoFile);
        setPhotoUrl(await downloadProfilePhoto(photoKey));
      }
      setPhotoFile(null);
      setCompletedAt((current) => current ?? new Date().toISOString());
      const destination = consumeReturnPath() ?? requestedReturnPath;
      if (destination) {
        navigate(destination, { replace: true });
        return;
      }
      if (completingForFirstTime) {
        navigate("/", { replace: true });
        return;
      }
      setNotice({ kind: "success", text: "Profilo completato. Ora puoi trovare un’uscita oppure proporne una." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setNotice({ kind: "error", text: readableError(caught) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-status">Caricamento profilo…</div>;

  return (
    <section className="profile-page page-wide">
      <div className="profile-heading">
        <div>
          <div className="eyebrow">Passo 2 di 2</div>
          <h1>Il tuo profilo pescatore</h1>
          <p>Questi dati serviranno a trovare uscite compatibili, non a creare un social feed.</p>
        </div>
        <div className={`completion-badge ${completedAt ? "complete" : ""}`}>
          {completedAt ? "Profilo completo" : `${completionCount}/4 essenziali`}
        </div>
      </div>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <form className="profile-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <fieldset>
          <legend>Informazioni personali</legend>
          <div className="photo-control">
            <div className="avatar" aria-hidden="true">
              {photoUrl ? <img src={photoUrl} alt="" /> : values.displayName.slice(0, 1).toUpperCase() || "P"}
            </div>
            <label className="file-label">
              Foto profilo <span>(opzionale, max 3 MB)</span>
              <input accept="image/jpeg,image/png,image/webp" type="file" onChange={choosePhoto} />
              {photoFile && <small>Selezionata: {photoFile.name}</small>}
            </label>
          </div>
          <div className="form-grid">
            <label>
              Nome
              <input name="displayName" value={values.displayName} onChange={updateText} />
              <FormError message={errors.displayName} />
            </label>
            <label>
              Provincia
              <select name="provinceCode" value={values.provinceCode} onChange={updateText}>
                {LAZIO_PROVINCES.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
              </select>
              <FormError message={errors.provinceCode} />
            </label>
            <label>
              Comune o zona
              <input name="municipalityName" value={values.municipalityName} onChange={updateText} />
              <FormError message={errors.municipalityName} />
            </label>
            <label>
              Zona abituale <span className="optional">opzionale</span>
              <input name="genericZone" placeholder="Es. Litorale nord" value={values.genericZone} onChange={updateText} />
              <FormError message={errors.genericZone} />
            </label>
            <label>
              Fascia di età
              <select name="ageBand" value={values.ageBand} onChange={updateText}>
                <option value="">Seleziona</option>
                {AGE_BANDS.map((band) => <option key={band.value} value={band.value}>{band.label}</option>)}
              </select>
              <FormError message={errors.ageBand} />
            </label>
          </div>
          <label>
            Breve descrizione <span className="optional">opzionale</span>
            <textarea maxLength={500} name="bio" placeholder="Come ti piace vivere la pesca?" rows={4} value={values.bio} onChange={updateText} />
            <span className="field-help">{values.bio.length}/500</span>
            <FormError message={errors.bio} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Come peschi</legend>
          <div className="form-grid">
            <label>
              Tipo di acqua
              <select name="waterType" value={values.waterType} onChange={updateText}>
                <option value="">Seleziona</option>
                <option value="sea">Mare</option>
                <option value="freshwater">Acqua dolce</option>
                <option value="both">Entrambi</option>
              </select>
              <FormError message={errors.waterType} />
            </label>
            <label>
              Livello
              <select name="skillLevel" value={values.skillLevel} onChange={updateText}>
                <option value="">Seleziona</option>
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="expert">Esperto</option>
              </select>
              <FormError message={errors.skillLevel} />
            </label>
          </div>
          <div className="choice-group">
            <span className="group-label">Tecniche praticate</span>
            <div className="chip-grid">
              {techniques.map((item) => (
                <label className={`choice-chip ${values.techniqueIds.includes(item.id) ? "selected" : ""}`} key={item.id}>
                  <input checked={values.techniqueIds.includes(item.id)} type="checkbox" onChange={() => toggleId("techniqueIds", item.id)} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <FormError message={errors.techniqueIds} />
          </div>
        </fieldset>

        <fieldset>
          <legend>Quando e quanto ti sposti</legend>
          <div className="choice-group">
            <span className="group-label">Disponibilità indicativa</span>
            <div className="chip-grid">
              {availability.map((item) => (
                <label className={`choice-chip ${values.availabilitySlotIds.includes(item.id) ? "selected" : ""}`} key={item.id}>
                  <input checked={values.availabilitySlotIds.includes(item.id)} type="checkbox" onChange={() => toggleId("availabilitySlotIds", item.id)} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <FormError message={errors.availabilitySlotIds} />
          </div>
          <label>
            Distanza indicativa
            <select name="travelRadiusKm" value={values.travelRadiusKm} onChange={updateText}>
              <option value="10">Fino a 10 km</option>
              <option value="25">Fino a 25 km</option>
              <option value="50">Fino a 50 km</option>
              <option value="100">Fino a 100 km</option>
              <option value="">Senza limite specifico</option>
            </select>
          </label>
        </fieldset>

        <div className="sticky-save">
          <button className="button button-primary" disabled={saving} type="submit">
            {saving ? "Salvataggio…" : "Salva profilo"}
          </button>
        </div>
      </form>
    </section>
  );
}
