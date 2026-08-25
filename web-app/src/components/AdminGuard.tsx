import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) return <div className="page-status">Verifica autorizzazioni…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
