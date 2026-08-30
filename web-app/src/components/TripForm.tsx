import type { ChangeEvent, FormEvent } from "react";
import { CoastalZoneCombobox } from "./CoastalZoneCombobox";
import { FormError } from "./FormError";
import { Notice } from "./Notice";
import { LAZIO_PROVINCES } from "../types/domain";
import type { CatalogItem, FieldErrors, TripValues } from "../types/domain";
import {
  LAZIO_COASTAL_PROVINCES,
  findCoastalZone,
  isLazioCoastalProvince,
} from "../lib/lazioCoastalZones";
import { automaticTripTitle, zoneFieldLabel } from "../lib/tripExperience";

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

function followingDate(value: string) {
  if (!value) return "";
  const date = new Date(value + "T12:00:00");
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

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
  function titleFor(next: TripValues) {
    const technique = techniques.find((item) => item.id === next.techniqueId)?.label ?? "";
    return automaticTripTitle(technique, next.publicZone);
  }

  function change(next: TripValues) {
    onChange(next.titleIsCustom ? next : { ...next, title: titleFor(next) });
  }

  function updateText(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    const nextValue = name === "techniqueId" || name === "maxParticipants"
      ? value === "" ? "" : Number(value)
      : value;
    let next = { ...values, [name]: nextValue } as TripValues;

    if (name === "tripType" && value === "protected") next.publicMeetingPoint = "";
    if (name === "waterType" && value !== values.waterType) {
      next.publicZone = "";
      if (value === "sea" && !isLazioCoastalProvince(values.provinceCode)) next.provinceCode = "RM";
    }
    if (name === "provinceCode" && values.waterType === "sea" && value !== values.provinceCode) {
      const selectedZone = findCoastalZone(values.publicZone);
      if (selectedZone && selectedZone.provinceCode !== value) next.publicZone = "";
    }
    if (name === "endMode" && value !== values.endMode) {
      if (value === "flexible") {
        next.endDate = "";
        next.endTime = "";
      } else if (value === "same_day") {
        next.endDate = "";
        next.endTime = values.endTime || "12:00";
      } else {
        next.endDate = values.endDate || followingDate(values.date);
        next.endTime = "";
      }
    }
    change(next);
  }

  function updateCoastalZone(publicZone: string, provinceCode?: string) {
    change({
      ...values,
      publicZone,
      ...(provinceCode ? { provinceCode } : {}),
    });
  }

  const provinceOptions = values.waterType === "sea" ? LAZIO_COASTAL_PROVINCES : LAZIO_PROVINCES;
  const proposedTitle = values.title || titleFor(values);

  return (
    <form className="profile-form trip-create-form" onSubmit={onSubmit} noValidate>
      <fieldset>
        <legend>Che uscita proponi</legend>
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
            <label className={"trip-type-card " + (values.tripType === "protected" ? "selected" : "")}>
              <input type="radio" name="tripType" value="protected" checked={values.tripType === "protected"} onChange={updateText} />
              <span><strong>Uscita protetta</strong><small>Pubblica solo la zona. Scelta consigliata.</small></span>
            </label>
            <label className={"trip-type-card " + (values.tripType === "free" ? "selected" : "")}>
              <input type="radio" name="tripType" value="free" checked={values.tripType === "free"} onChange={updateText} />
              <span><strong>Uscita libera</strong><small>Puoi aggiungere indicazioni pubbliche.</small></span>
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Quando</legend>
        <div className="trip-schedule-grid">
          <label>
            Data di inizio
            <input type="date" name="date" value={values.date} onChange={updateText} />
            <FormError message={errors.date} />
          </label>
          <label>
            Ora di inizio
            <input type="time" name="startTime" value={values.startTime} onChange={updateText} />
            <FormError message={errors.startTime} />
          </label>
          <label>
            Quando finisce?
            <select name="endMode" value={values.endMode} onChange={updateText}>
              <option value="flexible">In giornata, senza orario</option>
              <option value="same_day">Lo stesso giorno, a un’ora precisa</option>
              <option value="another_day">Un altro giorno</option>
            </select>
          </label>
          {values.endMode === "same_day" && (
            <label>
              Ora di fine
              <input type="time" name="endTime" value={values.endTime} onChange={updateText} />
              <FormError message={errors.endTime} />
            </label>
          )}
          {values.endMode === "another_day" && (
            <>
              <label>
                Giorno di fine
                <input min={values.date || undefined} type="date" name="endDate" value={values.endDate} onChange={updateText} />
                <FormError message={errors.endDate} />
              </label>
              <label>
                Ora di fine <span className="optional">opzionale</span>
                <input type="time" name="endTime" value={values.endTime} onChange={updateText} />
                <span className="field-help">Se la lasci vuota, non mostreremo un orario preciso.</span>
                <FormError message={errors.endTime} />
              </label>
            </>
          )}
        </div>
        {values.endMode === "flexible" && <p className="field-help schedule-friendly-copy">Finché ne abbiamo voglia.</p>}
      </fieldset>

      <fieldset>
        <legend>Dove</legend>
        <div className="form-grid">
          <label>
            {zoneFieldLabel(values.waterType)}
            {values.waterType === "sea" ? (
              <CoastalZoneCombobox
                value={values.publicZone}
                provinceCode={values.provinceCode}
                onChange={updateCoastalZone}
              />
            ) : (
              <input
                name="publicZone"
                maxLength={160}
                value={values.publicZone}
                onChange={updateText}
                placeholder={values.waterType === "freshwater" ? "Es. Lago di Bracciano o Tevere nord" : "Scegli prima il tipo di acqua"}
              />
            )}
            <FormError message={errors.publicZone} />
          </label>
          <label>
            <span className="field-label-line">
              <span>Provincia</span>
              {values.waterType === "sea" && <span className="field-help">automatica dalla zona</span>}
            </span>
            <select name="provinceCode" value={values.provinceCode} onChange={updateText}>
              {provinceOptions.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
            </select>
            <FormError message={errors.provinceCode} />
          </label>
        </div>

        <div className="generated-title-card">
          <div>
            <span>Titolo dell’uscita</span>
            <strong>{proposedTitle}</strong>
          </div>
          {!values.titleIsCustom ? (
            <button
              className="text-button"
              type="button"
              onClick={() => onChange({ ...values, title: proposedTitle, titleIsCustom: true })}
            >
              Personalizza
            </button>
          ) : (
            <button
              className="text-button"
              type="button"
              onClick={() => onChange({ ...values, title: titleFor(values), titleIsCustom: false })}
            >
              Usa automatico
            </button>
          )}
        </div>
        {values.titleIsCustom && (
          <label>
            Titolo personalizzato
            <input name="title" maxLength={120} value={values.title} onChange={updateText} placeholder="Scrivi un titolo breve" />
            <FormError message={errors.title} />
          </label>
        )}

        {values.tripType === "protected" ? (
          <Notice kind="info">Non inserire spot o coordinate precise. Il punto d’incontro sarà condiviso solo dopo la conferma.</Notice>
        ) : (
          <label>
            Indicazioni pubbliche <span className="optional">opzionali</span>
            <textarea name="publicMeetingPoint" rows={3} maxLength={240} value={values.publicMeetingPoint} onChange={updateText} placeholder="Solo se vuoi renderle visibili a tutti" />
            <FormError message={errors.publicMeetingPoint} />
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>Partecipanti</legend>
        <div className="form-grid">
          <label>
            <span className="field-label-line">
              <span>Partecipanti totali</span>
              <span className="field-help">tu incluso</span>
            </span>
            <input type="number" min={2} max={20} name="maxParticipants" value={values.maxParticipants} onChange={updateText} />
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

        <details className="optional-details" open={Boolean(values.description || errors.description) || undefined}>
          <summary>Aggiungi informazioni utili <span>opzionale</span></summary>
          <label>
            Informazioni utili
            <textarea
              name="description"
              rows={4}
              maxLength={3000}
              value={values.description}
              onChange={updateText}
              placeholder="Es. Pesca da riva, partenza all’alba. Portare waders e lampada frontale."
            />
            <span className="field-help">Scrivi solo ciò che aiuta davvero gli altri a prepararsi.</span>
            <FormError message={errors.description} />
          </label>
        </details>
      </fieldset>

      <div className="sticky-save">
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? savingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
