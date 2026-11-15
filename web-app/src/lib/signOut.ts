import { requireSupabase } from "./supabase";
import { disablePushNotifications } from "./pushNotifications";

export async function signOutLocally() {
  // Revoke this device while the current identity can still remove its row.
  await disablePushNotifications();
  const { error } = await requireSupabase().auth.signOut({ scope: "local" });
  if (error) throw error;
}
