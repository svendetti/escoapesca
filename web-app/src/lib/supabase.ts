import { createClient } from "@supabase/supabase-js";

type PublicRuntimeConfig = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

declare global {
  var __ESCOAPESCA_PUBLIC_CONFIG__: PublicRuntimeConfig | undefined;
}

const runtimeConfig = globalThis.__ESCOAPESCA_PUBLIC_CONFIG__;
const supabaseUrl = runtimeConfig?.supabaseUrl?.trim()
  || import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = runtimeConfig?.supabasePublishableKey?.trim()
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase non configurato: copia .env.example in .env.local.");
  }
  return supabase;
}
