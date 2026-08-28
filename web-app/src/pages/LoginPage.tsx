import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import {
  consumeReturnPath,
  normalizeInternalReturnPath,
  peekReturnPath,
  postAuthPath,
  rememberReturnPath,
  withReturnPath,
} from "../lib/returnPath";
import { requireSupabase } from "../lib/supabase";
import { Notice } from "../components/Notice";

export function LoginPage() {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { from?: string; authError?: string | null } | null;
  const requestedReturnPath = normalizeInternalReturnPath(
    new URLSearchParams(location.search).get("returnTo"),
  ) ?? normalizeInternalReturnPath(routeState?.from) ?? peekReturnPath();
  if (requestedReturnPath) rememberReturnPath(requestedReturnPath);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => routeState?.authError
    ? "Il link email non è più valido. Richiedi un nuovo link di conferma e usa quello più recente."
    : null);
  const [submitting, setSubmitting] = useState(false);

  const continueAfterAuthentication = useCallback(async (userId: string) => {
    const client = requireSupabase();
    const destination = requestedReturnPath ?? peekReturnPath();
    const { data: profile, error: profileError } = await client
      .from("fisher_profiles")
      .select("completed_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError) throw profileError;

    const target = postAuthPath(destination, Boolean(profile?.completed_at));
    if (profile?.completed_at && destination) consumeReturnPath();
    navigate(target, { replace: true });
  }, [navigate, requestedReturnPath]);

  useEffect(() => {
    if (!user || submitting) return;
    let active = true;
    void continueAfterAuthentication(user.id).catch((caught) => {
      if (active) setError(readableError(caught));
    });
    return () => {
      active = false;
    };
  }, [continueAfterAuthentication, submitting, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const client = requireSupabase();
      const { data, error: authError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      await continueAfterAuthentication(data.user.id);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (user) {
    return (
      <div className="page-status">
        {error ?? "Apertura della pagina richiesta…"}
      </div>
    );
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
        <span>Non hai un account? <Link to={withReturnPath("/registrati", requestedReturnPath)}>Registrati</Link></span>
      </div>
    </section>
  );
}
