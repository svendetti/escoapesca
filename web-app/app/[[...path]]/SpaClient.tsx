"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { initializeClientStartup } from "../../src/lib/clientStartup";

initializeClientStartup();

export type PublicRuntimeConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export function SpaClient({ config }: { config: PublicRuntimeConfig }) {
  const [AppComponent, setAppComponent] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const runtime = globalThis as typeof globalThis & {
      __ESCOAPESCA_PUBLIC_CONFIG__?: PublicRuntimeConfig;
    };
    runtime.__ESCOAPESCA_PUBLIC_CONFIG__ = config;
    void import("../../src/App")
      .then((module) => setAppComponent(() => module.App))
      .catch(() => setFailed(true));
  }, [config.supabasePublishableKey, config.supabaseUrl]);

  if (failed) {
    return (
      <div className="page-status">
        Impossibile avviare EscoAPesca. Aggiorna la pagina e riprova.
      </div>
    );
  }

  if (!AppComponent) return <div className="page-status">Caricamento EscoAPesca…</div>;
  return <AppComponent />;
}
