import type { ChangeEvent, FormEvent } from "react";
import { FormError } from "./FormError";
import { Notice } from "./Notice";
import { LAZIO_PROVINCES } from "../types/domain";
import type { CatalogItem, FieldErrors, TripValues } from "../types/domain";

type TripFormProps = {
  values: TripValues;
  techniques: CatalogItem[];
  errors: FieldErrors<TripValues>;
  saving: boolean;
  submitLabel: string;
  savingLabel: string;
  onChange: (values: TripValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TripForm({
  values,
  techniques,
  errors,
  saving,
  submitLabel,
  savingLabel,
  onChange,
  onSubmit,
}: TripFormProps) {
  function updateText(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    onChange({
      ...values,
      [name]: name === "techniqueId" || name === "maxParticipants"
        ? value === "" ? "" : Number(value)
        : value,
      ...(name === "tripType" && value === "protected" ? { publicMeetingPoint: "" } : {}),
    });
  }

  return (
    <form className="profile-form" onSubmit={onSubmit} noValidate>
      <fieldset>
        <legend>Che uscita proponi</legend>
        <label>
          Titolo
          <input name="title" maxLength={120} value={values.title} onChange={updateText} placeholder="Es. Spinning al tramonto" />
          <FormError message={errors.title} />
        </label>
        <div className="form-grid">
          <label>
            Tecnica
            <select name="techniqueId" value={values.techniqueId} onChange={updateText}>
              <option value="">Seleziona</option>
              {techniques.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <FormError message={errors.techniqueId} />
          </label>
          <label>
            Tipo di acqua
            <select name="waterType" value={values.waterType} onChange={updateText}>
              <option value="">Seleziona</option>
              <option value="sea">Mare</option>
              <option value="freshwater">Acqua dolce</option>
            </select>
            <FormError message={errors.waterType} />
          </label>
        </div>
        <div className="choice-group">
          <span className="group-label">Visibilità della località</span>
          <div className="trip-type-grid">
            <label className={`trip-type-card ${values.tripType === "protected" ? "selected" : ""}`}>
              <input type="radio" name="tripType" value="protected" checked={values.tripType === "protected"} onChange={updateText} />
              <span><strong>Uscita protetta</strong><small>Pubblica solo la zona generica. Scelta consigliata.</small></span>
            </label>
            <label className={`trip-type-card ${values.tripType === "free" ? "selected" : ""}`}>
              <input type="radio" name="tripType" value="free" checked={values.tripType === "free"} onChange={updateText} />
              <span><strong>Uscita libera</strong><small>Puoi mostrare indicazioni pubbliche.</small></span>
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Quando</legend>
        <div className="form-grid three-columns">
          <label>
            Data
            <input type="date" name="date" value={values.date} onChange={updateText} />
            <FormError message={errors.date} />
          </label>
          <label>
            Inizio indicativo
            <input type="time" name="startTime" value={values.startTime} onChange={updateText} />
            <FormError message={errors.startTime} />
          </label>
          <label>
            Fine indicativa
            <input type="time" name="endTime" value={values.endTime} onChange={updateText} />
            <span className="field-help">Se è prima dell’inizio, si intende il giorno dopo.</span>
            <FormError message={errors.endTime} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Dove</legend>
        <div className="form-grid">
          <label>
            Provincia
            <select name="provinceCode" value={values.provinceCode} onChange={updateText}>
              {LAZIO_PROVINCES.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
            </select>
            <FormError message={errors.provinceCode} />
          </label>
          <label>
            Zona generica
            <input name="publicZone" maxLength={160} value={values.publicZone} onChange={updateText} placeholder="Es. Litorale di Ostia" />
            <FormError message={errors.publicZone} />
          </label>
        </div>
        {values.tripType === "protected" ? (
          <Notice kind="info">Non inserire qui spot o coordinate precise. Il punto d’incontro privato verrà condiviso solo dopo la conferma.</Notice>
        ) : (
          <label>
            Indicazioni pubbliche <span className="optional">opzionali</span>
            <textarea name="publicMeetingPoint" rows={3} maxLength={240} value={values.publicMeetingPoint} onChange={updateText} placeholder="Solo se vuoi renderle visibili a tutti" />
            <FormError message={errors.publicMeetingPoint} />
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>Per chi e come</legend>
        <div className="form-grid">
          <label>
            Partecipanti totali
            <input type="number" min={2} max={20} name="maxParticipants" value={values.maxParticipants} onChange={updateText} />
            <span className="field-help">Organizzatore incluso.</span>
            <FormError message={errors.maxParticipants} />
          </label>
          <label>
            Livello consigliato
            <select name="recommendedLevel" value={values.recommendedLevel} onChange={updateText}>
              <option value="any">Qualsiasi livello</option>
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="expert">Esperto</option>
            </select>
          </label>
        </div>
        <label>
          Descrizione
          <textarea name="description" rows={5} maxLength={2000} value={values.description} onChange={updateText} placeholder="Che tipo di uscita immagini? Ritmo, obiettivo e informazioni utili." />
          <FormError message={errors.description} />
        </label>
        <label>
          Attrezzatura o note <span className="optional">opzionali</span>
          <textarea name="gearNotes" rows={3} maxLength={1000} value={values.gearNotes} onChange={updateText} placeholder="Es. Portare waders e lampada frontale" />
          <FormError message={errors.gearNotes} />
        </label>
      </fieldset>

      <div className="sticky-save">
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? savingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
