import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  accountStatus: "active" | "disabled" | null;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<"active" | "disabled" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        setSession(error ? null : data.session);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (nextSession) sessionStorage.removeItem("escoapesca:pending-email");
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setAccountStatus(null);
      setIsAdmin(false);
      setAccessLoading(false);
      return;
    }

    let active = true;
    setAccessLoading(true);
    void Promise.all([
      supabase.from("app_users").select("status").eq("id", session.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle(),
    ]).then(([accountResult, roleResult]) => {
      if (!active) return;
      const status = accountResult.data?.status;
      setAccountStatus(status === "active" || status === "disabled" ? status : null);
      setIsAdmin(!roleResult.error && roleResult.data?.role === "admin");
    }).catch(() => {
      if (!active) return;
      setAccountStatus(null);
      setIsAdmin(false);
    }).finally(() => {
      if (active) setAccessLoading(false);
    });

    return () => { active = false; };
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading: authLoading || accessLoading,
    configured: isSupabaseConfigured,
    accountStatus,
    isAdmin,
  }), [accessLoading, accountStatus, authLoading, isAdmin, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve essere usato dentro AuthProvider");
  return context;
}
