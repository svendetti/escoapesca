import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-status">Caricamento…</div>;
  if (!user) {
    const authError = new URLSearchParams(location.hash.slice(1)).get("error_code");
    return (
      <Navigate to="/accedi" replace state={{ from: location.pathname, authError }} />
    );
  }
  return children;
}
