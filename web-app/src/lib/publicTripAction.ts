import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeParticipationRequestMessage } from "./participationRequest";

export type PublicTripActionMode =
  | "loading" | "guest" | "profile" | "ready" | "manage" | "disabled"
  | "requested" | "accepted" | "rejected" | "confirmed" | "completed" | "no_show" | "error";

export async function loadPublicTripActionState(client: SupabaseClient, tripId: string): Promise<PublicTripActionMode> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  if (!userId) return "guest";

  const [account, profile, ownTrip, participation] = await Promise.all([
    client.from("app_users").select("status").eq("id", userId).maybeSingle(),
    client.from("fisher_profiles").select("completed_at").eq("user_id", userId).maybeSingle(),
    client.from("fishing_trips").select("id").eq("id", tripId).eq("organizer_user_id", userId).maybeSingle(),
    client.from("trip_participants").select("status").eq("trip_id", tripId).eq("user_id", userId).maybeSingle(),
  ]);
  for (const result of [account, profile, ownTrip, participation]) {
    if (result.error) throw result.error;
  }
  if (account.data?.status === "disabled") return "disabled";
  if (account.data?.status !== "active") throw new Error("Account non disponibile");
  if (ownTrip.data) return "manage";

  const status = participation.data?.status;
  if (status && status !== "cancelled") {
    if (["requested", "accepted", "rejected", "confirmed", "completed", "no_show"].includes(status)) {
      return status as PublicTripActionMode;
    }
    throw new Error("Stato partecipazione non disponibile");
  }
  return profile.data?.completed_at ? "ready" : "profile";
}

export async function requestPublicTripParticipation(client: SupabaseClient, tripId: string, message: string) {
  const { data, error } = await client.rpc("request_trip_participation", {
    p_trip_id: tripId,
    p_request_message: normalizeParticipationRequestMessage(message),
  });
  if (error) throw error;
  if (data?.[0]?.participation_status !== "requested") {
    throw new Error("La richiesta non ha restituito uno stato valido.");
  }
}
