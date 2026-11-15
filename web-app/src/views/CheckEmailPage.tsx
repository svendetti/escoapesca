import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Notice } from "../components/Notice";
import { readableError } from "../lib/errors";
import {
  normalizeInternalReturnPath,
  peekReturnPath,
  rememberReturnPath,
  withReturnPath,
} from "../lib/returnPath";
import { requireSupabase } from "../lib/supabase";

export function CheckEmailPage() {
  const location = useLocation();
  const locationEmail = (location.state as { email?: string } | null)?.email;
  const requestedReturnPath = normalizeInternalReturnPath(
    new URLSearchParams(location.search).get("returnTo"),
  ) ?? peekReturnPath();
  if (requestedReturnPath) rememberReturnPath(requestedReturnPath);
  const [email] = useState(() => locationEmail ?? sessionStorage.getItem("escoapesca:pending-email") ?? "");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function resendConfirmation() {
    if (!email || sending) return;
    setSending(true);
    setNotice(null);
    try {
      const { error } = await requireSupabase().auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: new URL(
            withReturnPath("/profilo", requestedReturnPath),
            window.location.origin,
          ).toString(),
        },
      });
      if (error) throw error;
      setNotice({ kind: "success", text: "Email reinviata. Usa il link più recente ricevuto." });
    } catch (caught) {
      setNotice({ kind: "error", text: readableError(caught) });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="auth-card page-narrow center-card">
      <div className="mail-icon" aria-hidden="true">✉</div>
      <h1>Controlla la tua email</h1>
      <p>
        Se l’indirizzo può ricevere email, abbiamo inviato un link di conferma{email ? <> a <strong>{email}</strong></> : null}.
        Apri il link e premi “Conferma email”; poi potrai completare il profilo pescatore.
      </p>
      <p className="field-help">Controlla anche lo spam e usa sempre il link più recente.</p>
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {email && (
        <button className="button button-secondary" disabled={sending} type="button" onClick={() => void resendConfirmation()}>
          {sending ? "Invio…" : "Reinvia email"}
        </button>
      )}
      <Link className="button button-secondary" to={withReturnPath("/accedi", requestedReturnPath)}>Torna all’accesso</Link>
    </section>
  );
}
