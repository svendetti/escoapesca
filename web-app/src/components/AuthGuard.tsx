import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { normalizeInternalReturnPath, rememberReturnPath } from "../lib/returnPath";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, accountStatus } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-status">Caricamento…</div>;
  if (!user) {
    const authError = new URLSearchParams(location.hash.slice(1)).get("error_code");
    const from = normalizeInternalReturnPath(`${location.pathname}${location.search}`);
    if (from) rememberReturnPath(from);
    return (
      <Navigate to="/accedi" replace state={{ from, authError }} />
    );
  }
  if (accountStatus === "disabled") {
    return <Navigate to="/account-disabilitato" replace />;
  }
  return children;
}
