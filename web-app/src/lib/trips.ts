import { requireSupabase } from "./supabase";
import { tripDateTimes } from "./validation";
import type {
  CatalogItem,
  FishingTrip,
  FishingTripDiscovery,
  TripDiscoveryFilters,
  TripValues,
} from "../types/domain";

export async function loadFishingTechniques(): Promise<CatalogItem[]> {
  const { data, error } = await requireSupabase()
    .from("fishing_techniques")
    .select("id, slug, name")
    .order("sort_order");

  if (error) throw error;
  return data.map((item) => ({ id: item.id, slug: item.slug, label: item.name }));
}

type DiscoveryRow = {
  id: string;
  organizer_user_id: string;
  organizer_name: string;
  title: string;
  technique_id: number;
  technique_name: string;
  water_type: FishingTripDiscovery["waterType"];
  starts_at: string;
  ends_at: string;
  province_code: string;
  province_name: string;
  public_zone: string;
  max_participants: number;
  available_places: number;
  recommended_level: FishingTripDiscovery["recommendedLevel"];
  description: string;
  trip_type: FishingTripDiscovery["tripType"];
};

function localDateBoundary(date: string, addDays: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const boundary = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(boundary.getTime())) return null;
  boundary.setDate(boundary.getDate() + addDays);
  return boundary.toISOString();
}

export function discoveryRpcArgs(filters: TripDiscoveryFilters) {
  return {
    p_province_code: filters.provinceCode || null,
    p_technique_id: filters.techniqueId || null,
    p_water_type: filters.waterType || null,
    p_starts_from: filters.date ? localDateBoundary(filters.date, 0) : null,
    p_starts_before: filters.date ? localDateBoundary(filters.date, 1) : null,
    p_limit: 50,
  };
}

export async function loadDiscoverableTrips(
  filters: TripDiscoveryFilters,
): Promise<FishingTripDiscovery[]> {
  const { data, error } = await requireSupabase().rpc(
    "search_fishing_trips",
    discoveryRpcArgs(filters),
  );

  if (error) throw error;
  return ((data ?? []) as DiscoveryRow[]).map((row) => ({
    id: row.id,
    organizerUserId: row.organizer_user_id,
    organizerName: row.organizer_name,
    title: row.title,
    techniqueId: row.technique_id,
    techniqueName: row.technique_name,
    waterType: row.water_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    provinceCode: row.province_code,
    provinceName: row.province_name,
    publicZone: row.public_zone,
    maxParticipants: row.max_participants,
    availablePlaces: row.available_places,
    recommendedLevel: row.recommended_level,
    description: row.description,
    tripType: row.trip_type,
  }));
}

const TRIP_SELECT = `
  id,
  organizer_user_id,
  title,
  technique_id,
  water_type,
  starts_at,
  ends_at,
  province_code,
  public_zone,
  public_meeting_point,
  max_participants,
  recommended_level,
  description,
  gear_notes,
  trip_type,
  status,
  cancelled_at,
  cancellation_reason,
  created_at,
  updated_at,
  fishing_techniques (name)
`;

type TripRow = {
  id: string;
  organizer_user_id: string;
  title: string;
  technique_id: number;
  water_type: FishingTrip["waterType"];
  starts_at: string;
  ends_at: string;
  province_code: string;
  public_zone: string;
  public_meeting_point: string | null;
  max_participants: number;
  recommended_level: FishingTrip["recommendedLevel"];
  description: string;
  gear_notes: string | null;
  trip_type: FishingTrip["tripType"];
  status: FishingTrip["status"];
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  fishing_techniques: { name: string } | Array<{ name: string }> | null;
};

function mapTrip(row: TripRow): FishingTrip {
  const technique = Array.isArray(row.fishing_techniques)
    ? row.fishing_techniques[0]
    : row.fishing_techniques;

  return {
    id: row.id,
    organizerUserId: row.organizer_user_id,
    title: row.title,
    techniqueId: row.technique_id,
    techniqueName: technique?.name ?? "Tecnica non disponibile",
    waterType: row.water_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    provinceCode: row.province_code,
    publicZone: row.public_zone,
    publicMeetingPoint: row.public_meeting_point,
    maxParticipants: row.max_participants,
    recommendedLevel: row.recommended_level,
    description: row.description,
    gearNotes: row.gear_notes,
    tripType: row.trip_type,
    status: row.status,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function writableTrip(values: TripValues) {
  const times = tripDateTimes(values);
  if (!times) throw new Error("Data o orario dell’uscita non validi.");

  return {
    title: values.title.trim(),
    technique_id: values.techniqueId,
    water_type: values.waterType,
    starts_at: times.startsAt.toISOString(),
    ends_at: times.endsAt.toISOString(),
    province_code: values.provinceCode,
    public_zone: values.publicZone.trim(),
    public_meeting_point: values.tripType === "free"
      ? values.publicMeetingPoint.trim() || null
      : null,
    max_participants: values.maxParticipants,
    recommended_level: values.recommendedLevel,
    description: values.description.trim(),
    gear_notes: values.gearNotes.trim() || null,
    trip_type: values.tripType,
  };
}

export async function createFishingTrip(organizerUserId: string, values: TripValues) {
  const { data, error } = await requireSupabase().from("fishing_trips").insert({
    organizer_user_id: organizerUserId,
    municipality_code: null,
    ...writableTrip(values),
    status: "open",
  }).select("id").single();

  if (error) throw error;
  return data.id as string;
}

export async function loadMyFishingTrips(userId: string): Promise<FishingTrip[]> {
  const { data, error } = await requireSupabase()
    .from("fishing_trips")
    .select(TRIP_SELECT)
    .eq("organizer_user_id", userId)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data as unknown as TripRow[]).map(mapTrip);
}

export async function loadFishingTrip(userId: string, tripId: string): Promise<FishingTrip> {
  const { data, error } = await requireSupabase()
    .from("fishing_trips")
    .select(TRIP_SELECT)
    .eq("id", tripId)
    .eq("organizer_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Uscita non trovata o non accessibile.");
  return mapTrip(data as unknown as TripRow);
}

export async function updateFishingTrip(
  userId: string,
  tripId: string,
  values: TripValues,
): Promise<FishingTrip> {
  const { data, error } = await requireSupabase()
    .from("fishing_trips")
    .update(writableTrip(values))
    .eq("id", tripId)
    .eq("organizer_user_id", userId)
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .select(TRIP_SELECT)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Questa uscita non è più modificabile.");
  return mapTrip(data as unknown as TripRow);
}

export async function cancelFishingTrip(
  userId: string,
  tripId: string,
  reason: string,
): Promise<FishingTrip> {
  const { data, error } = await requireSupabase()
    .from("fishing_trips")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason.trim() || null,
    })
    .eq("id", tripId)
    .eq("organizer_user_id", userId)
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .select(TRIP_SELECT)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Questa uscita non è più annullabile.");
  return mapTrip(data as unknown as TripRow);
}

function localPart(value: number) {
  return String(value).padStart(2, "0");
}

export function tripToValues(trip: FishingTrip): TripValues {
  const startsAt = new Date(trip.startsAt);
  const endsAt = new Date(trip.endsAt);

  return {
    title: trip.title,
    techniqueId: trip.techniqueId,
    waterType: trip.waterType,
    date: `${startsAt.getFullYear()}-${localPart(startsAt.getMonth() + 1)}-${localPart(startsAt.getDate())}`,
    startTime: `${localPart(startsAt.getHours())}:${localPart(startsAt.getMinutes())}`,
    endTime: `${localPart(endsAt.getHours())}:${localPart(endsAt.getMinutes())}`,
    provinceCode: trip.provinceCode,
    publicZone: trip.publicZone,
    publicMeetingPoint: trip.publicMeetingPoint ?? "",
    maxParticipants: trip.maxParticipants,
    recommendedLevel: trip.recommendedLevel,
    description: trip.description,
    gearNotes: trip.gearNotes ?? "",
    tripType: trip.tripType,
  };
}
