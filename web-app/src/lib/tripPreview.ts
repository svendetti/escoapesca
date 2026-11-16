import { requireSupabase } from "./supabase";
import { mapPublicTrip, type PublicTripRow } from "./publicTrip";
import type { TripStatus, TripParticipationStatus } from "../types/domain";

// This is an in-app view of public data, not a bypass of fishing_trips RLS.
export function tripPreviewPath(tripId: string) {
  return `/uscite/${encodeURIComponent(tripId)}/scheda`;
}

export function tripDetailsPath(trip: {
  id: string;
  role: "organizer" | "participant";
  status: TripStatus;
  participationStatus: TripParticipationStatus | null;
}) {
  if (trip.role === "organizer" || (
    ["confirmed", "completed"].includes(trip.status)
    && ["confirmed", "completed"].includes(trip.participationStatus ?? "")
  )) return `/uscite/${encodeURIComponent(trip.id)}`;
  return tripPreviewPath(trip.id);
}

export async function loadTripPreview(tripId: string) {
  const { data, error } = await requireSupabase().rpc("get_public_fishing_trip", { p_trip_id: tripId });
  if (error) throw error;
  return data?.[0] ? mapPublicTrip(data[0] as PublicTripRow) : null;
}
