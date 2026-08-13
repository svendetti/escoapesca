import type {
  FieldErrors,
  ProfileValues,
  RegistrationValues,
  TripValues,
} from "../types/domain";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(values: RegistrationValues) {
  const errors: FieldErrors<RegistrationValues> = {};

  if (values.displayName.trim().length < 2) errors.displayName = "Inserisci almeno 2 caratteri.";
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Inserisci un indirizzo email valido.";
  if (values.password.length < 10) errors.password = "Usa almeno 10 caratteri.";
  if (!values.provinceCode) errors.provinceCode = "Seleziona la provincia.";
  if (!values.municipalityName.trim()) errors.municipalityName = "Inserisci il comune o la zona.";
  if (!values.ageBand) errors.ageBand = "Seleziona la fascia di età.";
  if (!values.adultConfirmed) errors.adultConfirmed = "La Beta è riservata ai maggiorenni.";
  if (!values.privacyAccepted) errors.privacyAccepted = "Devi accettare la Privacy Policy.";
  if (!values.termsAccepted) errors.termsAccepted = "Devi accettare i Termini.";

  return errors;
}

export function validateProfile(values: ProfileValues) {
  const errors: FieldErrors<ProfileValues> = {};

  if (values.displayName.trim().length < 2) errors.displayName = "Inserisci almeno 2 caratteri.";
  if (!values.provinceCode) errors.provinceCode = "Seleziona la provincia.";
  if (!values.municipalityName.trim()) errors.municipalityName = "Inserisci il comune o la zona.";
  if (!values.ageBand) errors.ageBand = "Seleziona la fascia di età.";
  if (!values.waterType) errors.waterType = "Seleziona il tipo di acqua.";
  if (!values.skillLevel) errors.skillLevel = "Seleziona il livello.";
  if (values.techniqueIds.length === 0) errors.techniqueIds = "Seleziona almeno una tecnica.";
  if (values.availabilitySlotIds.length === 0) {
    errors.availabilitySlotIds = "Seleziona almeno una disponibilità.";
  }
  if (values.bio.trim().length > 500) errors.bio = "La descrizione non può superare 500 caratteri.";
  if (values.genericZone.trim().length > 160) errors.genericZone = "La zona non può superare 160 caratteri.";

  return errors;
}

export function tripDateTimes(values: Pick<TripValues, "date" | "startTime" | "endTime">) {
  if (!values.date || !values.startTime || !values.endTime) return null;

  const startsAt = new Date(`${values.date}T${values.startTime}:00`);
  const endsAt = new Date(`${values.date}T${values.endTime}:00`);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return null;
  if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1);

  return { startsAt, endsAt };
}

export function validateTrip(values: TripValues, now = new Date()) {
  const errors: FieldErrors<TripValues> = {};
  const titleLength = values.title.trim().length;
  const zoneLength = values.publicZone.trim().length;
  const descriptionLength = values.description.trim().length;

  if (titleLength < 4 || titleLength > 120) errors.title = "Usa da 4 a 120 caratteri.";
  if (!values.techniqueId) errors.techniqueId = "Seleziona la tecnica.";
  if (!values.waterType) errors.waterType = "Seleziona il tipo di acqua.";
  if (!values.date) errors.date = "Seleziona la data.";
  if (!values.startTime) errors.startTime = "Indica l’ora di inizio.";
  if (!values.endTime) errors.endTime = "Indica l’ora indicativa di fine.";

  const times = tripDateTimes(values);
  if (times && times.startsAt <= now) errors.date = "L’uscita deve iniziare nel futuro.";

  if (!values.provinceCode) errors.provinceCode = "Seleziona la provincia.";
  if (zoneLength < 2 || zoneLength > 160) errors.publicZone = "Usa da 2 a 160 caratteri.";
  if (values.tripType === "free" && values.publicMeetingPoint.trim().length > 240) {
    errors.publicMeetingPoint = "Le indicazioni pubbliche non possono superare 240 caratteri.";
  }
  if (values.maxParticipants < 2 || values.maxParticipants > 20) {
    errors.maxParticipants = "Scegli un numero totale da 2 a 20, organizzatore incluso.";
  }
  if (descriptionLength < 1 || descriptionLength > 2000) {
    errors.description = "Inserisci una descrizione (massimo 2.000 caratteri).";
  }
  if (values.gearNotes.trim().length > 1000) errors.gearNotes = "Le note non possono superare 1.000 caratteri.";

  return errors;
}

export function hasErrors<T extends object>(errors: FieldErrors<T>) {
  return Object.keys(errors).length > 0;
}

export function validateProfilePhoto(file: File) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(file.type)) return "Usa un file JPG, PNG o WebP.";
  if (file.size > 3 * 1024 * 1024) return "La foto non può superare 3 MB.";
  return null;
}
