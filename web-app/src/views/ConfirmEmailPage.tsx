import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Notice } from "../components/Notice";
import { readableError } from "../lib/errors";
import { normalizeAppReturnUrl } from "../lib/returnPath";
import { requireSupabase } from "../lib/supabase";

export function ConfirmEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const parameters = new URLSearchParams(location.search);
  const tokenHash = parameters.get("token_hash");
  const confirmationType = parameters.get("type");
  const destination = normalizeAppReturnUrl(parameters.get("next")) ?? "/profilo";
  const validRequest = Boolean(tokenHash && confirmationType === "email");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmEmail() {
    if (!tokenHash || confirmationType !== "email" || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const { error: confirmationError } = await requireSupabase().auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      if (confirmationError) throw confirmationError;
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <section className="auth-card page-narrow center-card">
      <div className="mail-icon" aria-hidden="true">✉</div>
      <h1>Conferma la tua email</h1>
      <p>
        Per proteggere il tuo account, la verifica richiede una conferma esplicita.
      </p>
      {!validRequest && (
        <Notice kind="error">Il link di conferma è incompleto. Richiedi una nuova email.</Notice>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {validRequest && (
        <button
          className="button button-primary"
          disabled={confirming}
          type="button"
          onClick={() => void confirmEmail()}
        >
          {confirming ? "Conferma…" : "Conferma email e continua"}
        </button>
      )}
      <Link className="button button-secondary" to="/controlla-email">Richiedi una nuova email</Link>
    </section>
  );
}
