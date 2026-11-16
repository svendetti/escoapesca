import type { RecommendedLevel, TripEndPrecision, TripStatus, TripType, TripWaterType } from "../types/domain";

export type PublicFishingTrip = {
  id: string;
  publicCode: string;
  title: string;
  techniqueName: string;
  waterType: TripWaterType;
  startsAt: string;
  endsAt: string;
  endPrecision: TripEndPrecision;
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
  return `${trip.title} · ${trip.publicCode} · ${privacy} · ${trip.publicZone}, ${trip.provinceName}. Scopri i dettagli su EscoAPesca.`;
}

export type PublicTripRow = {
  id: string;
  public_code: string;
  title: string;
  technique_name: string;
  water_type: PublicFishingTrip["waterType"];
  starts_at: string;
  ends_at: string;
  end_precision: PublicFishingTrip["endPrecision"];
  province_code: string;
  province_name: string;
  public_zone: string;
  public_meeting_point: string | null;
  max_participants: number;
  available_places: number | null;
  recommended_level: PublicFishingTrip["recommendedLevel"];
  description: string;
  trip_type: PublicFishingTrip["tripType"];
  status: PublicFishingTrip["status"];
};

export function mapPublicTrip(row: PublicTripRow): PublicFishingTrip {
  return {
    id: row.id,
    publicCode: row.public_code,
    title: row.title,
    techniqueName: row.technique_name,
    waterType: row.water_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    endPrecision: row.end_precision,
    provinceCode: row.province_code,
    provinceName: row.province_name,
    publicZone: row.public_zone,
    publicMeetingPoint: row.public_meeting_point,
    maxParticipants: row.max_participants,
    availablePlaces: row.available_places,
    recommendedLevel: row.recommended_level,
    description: row.description,
    tripType: row.trip_type,
    status: row.status,
  };
}
