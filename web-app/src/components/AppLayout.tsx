import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { loadUnreadNotificationCount } from "../lib/notifications";
import { requireSupabase } from "../lib/supabase";
import logoUrl from "../assets/logo-escoapesca.svg?url";

export function AppLayout() {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    let active = true;
    const refresh = () => {
      void loadUnreadNotificationCount()
        .then((count) => {
          if (active) setUnreadNotifications(count);
        })
        .catch(() => {
          if (active) setUnreadNotifications(0);
        });
    };

    refresh();
    window.addEventListener("escoapesca:notifications-updated", refresh);
    return () => {
      active = false;
      window.removeEventListener("escoapesca:notifications-updated", refresh);
    };
  }, [user]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await requireSupabase().auth.signOut({ scope: "local" });
    navigate("/", { replace: true });
  }

  return (
    <div className="app-shell">
      <div className="app-ambient" aria-hidden="true">
        <span className="ambient-current ambient-current-one" />
        <span className="ambient-current ambient-current-two" />
        <span className="ambient-sonar" />
      </div>
      <header className={`topbar${user ? " authenticated" : ""}`}>
        <Link className="brand" to="/" aria-label="EscoAPesca home">
          <img src={logoUrl} alt="" />
          <span>EscoA<b>Pesca</b><i aria-hidden="true" /></span>
        </Link>
        {user && (
          <nav aria-label="Navigazione principale">
            <NavLink className="nav-home" to="/" end>Home</NavLink>
            <NavLink to="/trova-uscita">Trova</NavLink>
            <NavLink to="/mie-uscite">Le mie</NavLink>
            <NavLink to="/crea-uscita">
              <span className="nav-label-wide">Crea uscita</span>
              <span className="nav-label-short">Crea</span>
            </NavLink>
            <NavLink className="notification-nav-link" to="/notifiche" aria-label={`Notifiche${unreadNotifications ? `, ${unreadNotifications} non lette` : ""}`}>
              Avvisi
              {unreadNotifications > 0 && <span>{Math.min(unreadNotifications, 99)}</span>}
            </NavLink>
            <NavLink to="/profilo">
              <span className="nav-label-wide">Profilo</span>
              <span className="nav-label-short">Io</span>
            </NavLink>
            <button className="link-button" disabled={signingOut} type="button" onClick={() => void signOut()}>
              {signingOut ? "…" : "Esci"}
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
