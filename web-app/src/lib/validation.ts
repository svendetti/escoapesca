import type {
  FieldErrors,
  ProfileValues,
  RegistrationValues,
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

export function hasErrors<T extends object>(errors: FieldErrors<T>) {
  return Object.keys(errors).length > 0;
}

export function validateProfilePhoto(file: File) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(file.type)) return "Usa un file JPG, PNG o WebP.";
  if (file.size > 3 * 1024 * 1024) return "La foto non può superare 3 MB.";
  return null;
}
