import type { RecommendedLevel, TripStatus, TripType, TripWaterType } from "../types/domain";

export type PublicFishingTrip = {
  id: string;
  title: string;
  techniqueName: string;
  waterType: TripWaterType;
  startsAt: string;
  endsAt: string;
  provinceCode: string;
  provinceName: string;
  publicZone: string;
  publicMeetingPoint: string | null;
  maxParticipants: number;
  availablePlaces: number | null;
  recommendedLevel: RecommendedLevel;
  description: string;
  tripType: TripType;
  status: Exclude<TripStatus, "draft">;
};

export type PublicTripPhase = "open" | "full" | "confirmed" | "cancelled" | "completed";

export function publicTripPhase(trip: PublicFishingTrip, now = Date.now()): PublicTripPhase {
  if (trip.status === "cancelled") return "cancelled";
  if (trip.status === "completed" || new Date(trip.endsAt).getTime() <= now) return "completed";
  if (trip.status === "confirmed") return "confirmed";
  if ((trip.availablePlaces ?? 0) <= 0) return "full";
  return "open";
}

export function canRequestPublicTrip(trip: PublicFishingTrip, now = Date.now()) {
  return publicTripPhase(trip, now) === "open"
    && new Date(trip.startsAt).getTime() > now;
}

export function publicTripShareDescription(trip: PublicFishingTrip) {
  const privacy = trip.tripType === "protected" ? "Spot protetto" : "Uscita libera";
  return `Uscita di pesca · ${privacy} · ${trip.publicZone}, ${trip.provinceName}. Scopri i dettagli su EscoAPesca.`;
}
