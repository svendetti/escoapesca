import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { requireSupabase } from "../lib/supabase";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: resetError } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/aggiorna-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card page-narrow">
      <div className="eyebrow">Recupero account</div>
      <h1>Reimposta la password</h1>
      {sent ? (
        <Notice kind="success">Se l’indirizzo è registrato, riceverai un link per scegliere una nuova password.</Notice>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)}>
          {error && <Notice kind="error">{error}</Notice>}
          <label>
            Email
            <input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? "Invio…" : "Invia il link"}
          </button>
        </form>
      )}
      <div className="auth-links"><Link to="/accedi">Torna all’accesso</Link></div>
    </section>
  );
}

export function UpdatePasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 10) return setError("Usa almeno 10 caratteri.");
    if (password !== confirmation) return setError("Le due password non coincidono.");
    setError(null);
    setSubmitting(true);
    try {
      const { error: updateError } = await requireSupabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      navigate("/profilo", { replace: true, state: { passwordUpdated: true } });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-status">Verifica del link…</div>;
  if (!user) {
    return (
      <section className="auth-card page-narrow">
        <h1>Link non valido o scaduto</h1>
        <p>Richiedi un nuovo link per reimpostare la password.</p>
        <Link className="button button-primary" to="/password-dimenticata">Richiedi un nuovo link</Link>
      </section>
    );
  }

  return (
    <section className="auth-card page-narrow">
      <h1>Scegli una nuova password</h1>
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Nuova password
          <input autoComplete="new-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label>
          Ripeti la password
          <input autoComplete="new-password" required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </label>
        <button className="button button-primary" disabled={submitting} type="submit">
          {submitting ? "Aggiornamento…" : "Aggiorna password"}
        </button>
      </form>
    </section>
  );
}
