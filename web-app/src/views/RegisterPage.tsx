import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FormError } from "../components/FormError";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import {
  normalizeInternalReturnPath,
  peekReturnPath,
  rememberReturnPath,
  withReturnPath,
} from "../lib/returnPath";
import { requireSupabase } from "../lib/supabase";
import { hasErrors, validateRegistration } from "../lib/validation";
import { AGE_BANDS, LAZIO_PROVINCES } from "../types/domain";
import type { FieldErrors, RegistrationValues } from "../types/domain";

const INITIAL_VALUES: RegistrationValues = {
  displayName: "",
  email: "",
  password: "",
  provinceCode: "RM",
  municipalityName: "",
  ageBand: "",
  adultConfirmed: false,
  privacyAccepted: false,
  termsAccepted: false,
};

export function RegisterPage() {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedReturnPath = normalizeInternalReturnPath(
    new URLSearchParams(location.search).get("returnTo"),
  ) ?? peekReturnPath();
  if (requestedReturnPath) rememberReturnPath(requestedReturnPath);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors<RegistrationValues>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/profilo" replace />;

  function updateText(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateCheckbox(event: ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.target;
    setValues((current) => ({ ...current, [name]: checked }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);
    setServerError(null);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      const email = values.email.trim();
      const profilePath = withReturnPath("/profilo", requestedReturnPath);
      const { data, error } = await requireSupabase().auth.signUp({
        email,
        password: values.password,
        options: {
          emailRedirectTo: new URL(profilePath, window.location.origin).toString(),
          data: {
            display_name: values.displayName.trim(),
            province_code: values.provinceCode,
            municipality_name: values.municipalityName.trim(),
            age_band: values.ageBand,
            adult_confirmed: values.adultConfirmed,
            privacy_accepted: values.privacyAccepted,
            terms_accepted: values.termsAccepted,
          },
        },
      });
      if (error) throw error;

      sessionStorage.setItem("escoapesca:pending-email", email);
      navigate(data.session ? profilePath : withReturnPath("/controlla-email", requestedReturnPath), {
        replace: true,
        state: { email },
      });
    } catch (caught) {
      setServerError(readableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card page-narrow page-register">
      <div className="eyebrow">Passo 1 di 2</div>
      <h1>Crea il tuo account</h1>
      <p>Pochi dati essenziali. Le preferenze di pesca arrivano subito dopo.</p>

      {serverError && <Notice kind="error">{serverError}</Notice>}
      <form noValidate onSubmit={(event) => void handleSubmit(event)}>
        <div className="form-grid">
          <label>
            Nome
            <input aria-describedby="display-name-error" autoComplete="name" name="displayName" value={values.displayName} onChange={updateText} />
            <FormError id="display-name-error" message={errors.displayName} />
          </label>
          <label>
            Email
            <input aria-describedby="email-error" autoComplete="email" inputMode="email" name="email" type="email" value={values.email} onChange={updateText} />
            <FormError id="email-error" message={errors.email} />
          </label>
          <label>
            Password
            <input aria-describedby="password-error" autoComplete="new-password" name="password" type="password" value={values.password} onChange={updateText} />
            <span className="field-help">Almeno 10 caratteri.</span>
            <FormError id="password-error" message={errors.password} />
          </label>
          <label>
            Provincia
            <select aria-describedby="province-error" name="provinceCode" value={values.provinceCode} onChange={updateText}>
              {LAZIO_PROVINCES.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
            </select>
            <FormError id="province-error" message={errors.provinceCode} />
          </label>
          <label>
            Comune o zona
            <input aria-describedby="municipality-error" autoComplete="address-level2" name="municipalityName" placeholder="Es. Fiumicino" value={values.municipalityName} onChange={updateText} />
            <FormError id="municipality-error" message={errors.municipalityName} />
          </label>
          <label>
            Fascia di età
            <select aria-describedby="age-error" name="ageBand" value={values.ageBand} onChange={updateText}>
              <option value="">Seleziona</option>
              {AGE_BANDS.map((band) => <option key={band.value} value={band.value}>{band.label}</option>)}
            </select>
            <FormError id="age-error" message={errors.ageBand} />
          </label>
        </div>

        <div className="consents">
          <label className="check-row">
            <input checked={values.adultConfirmed} name="adultConfirmed" type="checkbox" onChange={updateCheckbox} />
            <span>Confermo di avere almeno 18 anni.</span>
          </label>
          <FormError message={errors.adultConfirmed} />
          <label className="check-row">
            <input checked={values.privacyAccepted} name="privacyAccepted" type="checkbox" onChange={updateCheckbox} />
            <span>Ho letto e accetto la <a href="https://www.escoapesca.it/privacy-beta.html" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
          </label>
          <FormError message={errors.privacyAccepted} />
          <label className="check-row">
            <input checked={values.termsAccepted} name="termsAccepted" type="checkbox" onChange={updateCheckbox} />
            <span>Accetto i <a href="https://www.escoapesca.it/termini.html" target="_blank" rel="noreferrer">Termini di utilizzo</a>.</span>
          </label>
          <FormError message={errors.termsAccepted} />
        </div>

        <button className="button button-primary" disabled={!configured || submitting} type="submit">
          {submitting ? "Creazione account…" : "Crea account"}
        </button>
      </form>
      <div className="auth-links"><span>Hai già un account? <Link to={withReturnPath("/accedi", requestedReturnPath)}>Accedi</Link></span></div>
    </section>
  );
}
