import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logoUrl from "../assets/logo-escoapesca.svg?url";
import { useAuth } from "../contexts/AuthContext";
import { loadUnreadNotificationCount } from "../lib/notifications";
import { APP_RELEASE_LABEL } from "../lib/release";
import { signOutLocally } from "../lib/signOut";
import { readableError } from "../lib/errors";
import { Notice } from "./Notice";
import { MobileNavigation } from "./MobileNavigation";

export function AppLayout() {
  const { user, configured, accountStatus, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const accountMenu = useRef<HTMLDetailsElement>(null);
  const showNavigation = Boolean(user && accountStatus !== "disabled");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (accountMenu.current) accountMenu.current.open = false;
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    setUnreadNotifications(0);
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
    setSignOutError(null);
    try {
      await signOutLocally();
      navigate("/", { replace: true });
    } catch (caught) {
      setSignOutError(readableError(caught));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className={`app-shell${showNavigation ? " has-mobile-navigation" : ""}`}>
      <a className="skip-link" href="#app-main">Vai al contenuto</a>
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
        {showNavigation && (
          <nav className="desktop-navigation" aria-label="Navigazione principale">
            <NavLink className="nav-home" to="/" end>Home</NavLink>
            <NavLink to="/trova-uscita">Trova</NavLink>
            <NavLink to="/mie-uscite">
              <span className="nav-label-wide">Le mie uscite</span>
              <span className="nav-label-short">Le mie</span>
            </NavLink>
            <NavLink to="/crea-uscita">
              <span className="nav-label-wide">Proponi</span>
              <span className="nav-label-short">Crea</span>
            </NavLink>
            <NavLink
              className="notification-nav-link"
              to="/notifiche"
              aria-label={`Notifiche${unreadNotifications ? `, ${unreadNotifications} non lette` : ""}`}
            >
              Avvisi
              {unreadNotifications > 0 && <span>{Math.min(unreadNotifications, 99)}</span>}
            </NavLink>
            <NavLink to="/profilo">
              <span className="nav-label-wide">Profilo</span>
              <span className="nav-label-short">Io</span>
            </NavLink>
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
            <button className="link-button" disabled={signingOut} type="button" onClick={() => void signOut()}>
              {signingOut ? "…" : "Esci"}
            </button>
          </nav>
        )}
        {showNavigation && (
          <div className="mobile-header-actions">
            <Link className="mobile-create-link" to="/crea-uscita">
              <img src="/icons/lucide/plus.svg" width="18" height="18" alt="" aria-hidden="true" />
              Proponi
            </Link>
            <details className="mobile-account-menu" ref={accountMenu} onKeyDown={(event) => {
              if (event.key === "Escape" && accountMenu.current) {
                accountMenu.current.open = false;
                accountMenu.current.querySelector("summary")?.focus();
              }
            }}>
              <summary aria-label="Menu account">
                <img src="/icons/lucide/ellipsis.svg" width="24" height="24" alt="" aria-hidden="true" />
              </summary>
              <div>
                <Link to="/profilo">Il mio profilo</Link>
                {isAdmin && <Link to="/admin">Amministrazione</Link>}
                <button disabled={signingOut} type="button" onClick={() => void signOut()}>
                  {signingOut ? "Uscita…" : "Esci dall’account"}
                </button>
              </div>
            </details>
          </div>
        )}
      </header>

      {!configured && (
        <div className="config-warning" role="alert">
          Configurazione Supabase assente. Copia <code>.env.example</code> in <code>.env.local</code>.
        </div>
      )}

      <main id="app-main" tabIndex={-1}>{signOutError && <Notice kind="error">{signOutError}</Notice>}<Outlet /></main>
      <footer>
        <span>{APP_RELEASE_LABEL}</span>
        <span><a href="https://www.escoapesca.it/privacy-beta.html">Privacy</a> · <a href="https://www.escoapesca.it/termini.html">Termini</a></span>
      </footer>
      {showNavigation && <MobileNavigation unreadCount={unreadNotifications} />}
    </div>
  );
}
