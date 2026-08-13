import { SpaClient } from "./SpaClient";

export const dynamic = "force-dynamic";

export default function SpaPage() {
  return (
    <SpaClient
      config={{
        supabaseUrl: process.env.VITE_SUPABASE_URL ?? "",
        supabasePublishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      }}
    />
  );
}
