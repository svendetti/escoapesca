import { Link, useLocation } from "react-router-dom";

export function CheckEmailPage() {
  const email = (useLocation().state as { email?: string } | null)?.email;
  return (
    <section className="auth-card page-narrow center-card">
      <div className="mail-icon" aria-hidden="true">✉</div>
      <h1>Controlla la tua email</h1>
      <p>
        Abbiamo inviato un link di conferma{email ? <> a <strong>{email}</strong></> : null}.
        Dopo il clic potrai completare il profilo pescatore.
      </p>
      <p className="field-help">Non lo trovi? Controlla anche la cartella spam.</p>
      <Link className="button button-secondary" to="/accedi">Torna all’accesso</Link>
    </section>
  );
}
