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
          ? "Dalla Home puoi proporre una nuova uscita o aggiornare il tuo profilo pescatore."
          : "Crea il tuo profilo pescatore. Nel prossimo step potrai trovare o proporre un’uscita, senza esporre pubblicamente gli spot protetti."}
      </p>
      <div className="button-stack">
        {user ? (
          <>
            <Link className="button button-primary" to="/crea-uscita">Crea un’uscita</Link>
            <Link className="button button-secondary" to="/profilo">Vai al profilo</Link>
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
