import { requireSupabase } from "./supabase";
import type {
  RecommendedLevel,
  TripParticipationStatus,
  TripStatus,
  TripType,
  TripWaterType,
} from "../types/domain";

export type FishingTripParticipation = {
  participantId: string;
  participationStatus: TripParticipationStatus;
  requestedAt: string;
  participantUpdatedAt: string;
  id: string;
  organizerUserId: string;
  organizerName: string;
  title: string;
  techniqueId: number;
  techniqueName: string;
  waterType: TripWaterType;
  startsAt: string;
  endsAt: string;
  provinceCode: string;
  publicZone: string;
  maxParticipants: number;
  recommendedLevel: RecommendedLevel;
  tripType: TripType;
  status: TripStatus;
};

type MyTripParticipationRow = {
  participant_id: string;
  participation_status: TripParticipationStatus;
  requested_at: string;
  participant_updated_at: string;
  trip_id: string;
  organizer_user_id: string;
  organizer_name: string;
  title: string;
  technique_id: number;
  technique_name: string;
  water_type: TripWaterType;
  starts_at: string;
  ends_at: string;
  province_code: string;
  public_zone: string;
  max_participants: number;
  recommended_level: RecommendedLevel;
  trip_type: TripType;
  trip_status: TripStatus;
};

export type TripTimePhase = "upcoming" | "in_progress" | "past";
export type DashboardTripRole = "organizer" | "participant";
export type DashboardTripBucket = "organized" | "participating" | "past";

export async function loadMyTripParticipations(): Promise<FishingTripParticipation[]> {
  const { data, error } = await requireSupabase().rpc("list_my_trip_participations");

  if (error) throw error;
  return ((data ?? []) as MyTripParticipationRow[]).map((row) => ({
    participantId: row.participant_id,
    participationStatus: row.participation_status,
    requestedAt: row.requested_at,
    participantUpdatedAt: row.participant_updated_at,
    id: row.trip_id,
    organizerUserId: row.organizer_user_id,
    organizerName: row.organizer_name,
    title: row.title,
    techniqueId: row.technique_id,
    techniqueName: row.technique_name,
    waterType: row.water_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    provinceCode: row.province_code,
    publicZone: row.public_zone,
    maxParticipants: row.max_participants,
    recommendedLevel: row.recommended_level,
    tripType: row.trip_type,
    status: row.trip_status,
  }));
}

export function tripTimePhase(
  startsAt: string,
  endsAt: string,
  now = Date.now(),
): TripTimePhase {
  if (new Date(endsAt).getTime() <= now) return "past";
  if (new Date(startsAt).getTime() <= now) return "in_progress";
  return "upcoming";
}

export function dashboardTripBucket(
  role: DashboardTripRole,
  startsAt: string,
  endsAt: string,
  tripStatus: TripStatus,
  participationStatus: TripParticipationStatus | null,
  now = Date.now(),
): DashboardTripBucket {
  const archivedParticipation = participationStatus !== null
    && ["rejected", "cancelled", "completed", "no_show"].includes(participationStatus);

  if (
    tripTimePhase(startsAt, endsAt, now) === "past"
    || ["cancelled", "completed"].includes(tripStatus)
    || archivedParticipation
  ) {
    return "past";
  }

  return role === "organizer" ? "organized" : "participating";
}
