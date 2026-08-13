import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { requireSupabase } from "../lib/supabase";

export function AppLayout() {
  const { user, configured } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await requireSupabase().auth.signOut();
    navigate("/accedi");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="EscoAPesca home">
          <img src="/logo-escoapesca.svg" alt="" />
          <span>EscoAPesca</span>
        </Link>
        {user && (
          <nav aria-label="Navigazione principale">
            <NavLink to="/profilo">Profilo</NavLink>
            <button className="link-button" type="button" onClick={() => void signOut()}>
              Esci
            </button>
          </nav>
        )}
      </header>

      {!configured && (
        <div className="config-warning" role="alert">
          Configurazione Supabase assente. Copia <code>.env.example</code> in <code>.env.local</code>.
        </div>
      )}

      <main><Outlet /></main>
      <footer>
        <span>Beta Lazio v0.1</span>
        <span><a href="https://www.escoapesca.it/privacy-beta.html">Privacy</a> · <a href="https://www.escoapesca.it/termini.html">Termini</a></span>
      </footer>
    </div>
  );
}
