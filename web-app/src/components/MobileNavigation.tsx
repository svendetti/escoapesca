import { Link, useLocation } from "react-router-dom";

const ITEMS = [
  { to: "/", label: "Home", icon: "house" },
  { to: "/trova-uscita", label: "Trova", icon: "search" },
  { to: "/mie-uscite", label: "Uscite", icon: "calendar-days" },
  { to: "/notifiche", label: "Avvisi", icon: "bell" },
  { to: "/profilo", label: "Profilo", icon: "user-round" },
];

export function MobileNavigation({ unreadCount }: { unreadCount: number }) {
  const { pathname } = useLocation();
  const inTripWorkspace = pathname.startsWith("/uscite/") || pathname === "/crea-uscita";
  return (
    <nav className="mobile-bottom-nav" aria-label="Navigazione principale mobile">
      {ITEMS.map(({ to, label, icon }) => {
        const workspaceActive = to === "/mie-uscite" && inTripWorkspace;
        const active = pathname === to || workspaceActive;
        const notifications = to === "/notifiche";
        return (
          <Link key={to} to={to}
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : undefined}
            aria-label={notifications && unreadCount > 0 ? `Avvisi, ${unreadCount} non letti` : label}
          >
            <span className="mobile-nav-icon">
              <img src={`/icons/lucide/${icon}.svg`} width="23" height="23" alt="" aria-hidden="true" />
              {notifications && unreadCount > 0 && (
                <span className="mobile-nav-badge" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
