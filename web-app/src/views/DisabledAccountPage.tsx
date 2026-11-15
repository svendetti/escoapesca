import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requireSupabase } from "../lib/supabase";

export function DisabledAccountPage() {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await requireSupabase().auth.signOut({ scope: "local" });
    navigate("/", { replace: true });
  }

  return (
    <section className="page-narrow">
      <div className="empty-state">
        <span aria-hidden="true">!</span>
        <h1>Account temporaneamente disabilitato</h1>
        <p>Per informazioni contatta l’assistenza EscoAPesca. I tuoi dati e lo storico delle uscite non sono stati cancellati.</p>
        <button className="button button-secondary" disabled={signingOut} type="button" onClick={() => void signOut()}>
          {signingOut ? "Uscita…" : "Esci dall’account"}
        </button>
      </div>
    </section>
  );
}
