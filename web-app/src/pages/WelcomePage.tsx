import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function WelcomePage() {
  const { user } = useAuth();

  return (
    <section className="welcome page-narrow">
      <div className="eyebrow">Beta Lazio</div>
      <h1>
        {user
          ? "Bentornato in EscoAPesca."
          : "La prossima uscita inizia da una persona compatibile."}
      </h1>
      <p>
        {user
          ? "Proponi una nuova uscita oppure rivedi quelle che hai già organizzato."
          : "Crea il tuo profilo pescatore, trova un’uscita oppure proponine una, senza esporre pubblicamente gli spot protetti."}
      </p>
      <div className="button-stack">
        {user ? (
          <>
            <Link className="button button-primary" to="/crea-uscita">Crea un’uscita</Link>
            <Link className="button button-secondary" to="/mie-uscite">Le mie uscite</Link>
          </>
        ) : (
          <>
            <Link className="button button-primary" to="/registrati">Crea il profilo</Link>
            <Link className="button button-secondary" to="/accedi">Ho già un account</Link>
          </>
        )}
      </div>
      <p className="microcopy">Niente feed, like o chat invasiva. Solo ciò che serve per andare a pesca insieme.</p>
    </section>
  );
}
