import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Notice } from "../components/Notice";
import { readableError } from "../lib/errors";
import { requireSupabase } from "../lib/supabase";

export function CheckEmailPage() {
  const locationEmail = (useLocation().state as { email?: string } | null)?.email;
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
        options: { emailRedirectTo: `${window.location.origin}/profilo` },
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
        Dopo il clic potrai completare il profilo pescatore.
      </p>
      <p className="field-help">Controlla anche lo spam e usa sempre il link più recente.</p>
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {email && (
        <button className="button button-secondary" disabled={sending} type="button" onClick={() => void resendConfirmation()}>
          {sending ? "Invio…" : "Reinvia email"}
        </button>
      )}
      <Link className="button button-secondary" to="/accedi">Torna all’accesso</Link>
    </section>
  );
}
