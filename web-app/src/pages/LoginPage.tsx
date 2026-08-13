import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { requireSupabase } from "../lib/supabase";
import { Notice } from "../components/Notice";

export function LoginPage() {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { from?: string; authError?: string | null } | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => routeState?.authError
    ? "Il link email non è più valido. Richiedi un nuovo link di conferma e usa quello più recente."
    : null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/profilo" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: authError } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;

      navigate(routeState?.from ?? "/profilo", { replace: true });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card page-narrow">
      <div className="eyebrow">Bentornato</div>
      <h1>Accedi</h1>
      <p>Riprendi da dove avevi lasciato.</p>

      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Email
          <input autoComplete="email" inputMode="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button className="button button-primary" disabled={!configured || submitting} type="submit">
          {submitting ? "Accesso…" : "Accedi"}
        </button>
      </form>

      <div className="auth-links">
        <Link to="/password-dimenticata">Password dimenticata?</Link>
        <span>Non hai un account? <Link to="/registrati">Registrati</Link></span>
      </div>
    </section>
  );
}
