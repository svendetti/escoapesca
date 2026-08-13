import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function WelcomePage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/profilo" replace />;

  return (
    <section className="welcome page-narrow">
      <div className="eyebrow">Beta Lazio</div>
      <h1>La prossima uscita inizia da una persona compatibile.</h1>
      <p>
        Crea il tuo profilo pescatore. Nel prossimo step potrai trovare o proporre
        un’uscita, senza esporre pubblicamente gli spot protetti.
      </p>
      <div className="button-stack">
        <Link className="button button-primary" to="/registrati">Crea il profilo</Link>
        <Link className="button button-secondary" to="/accedi">Ho già un account</Link>
      </div>
      <p className="microcopy">Niente feed, like o chat invasiva. Solo ciò che serve per andare a pesca insieme.</p>
    </section>
  );
}
