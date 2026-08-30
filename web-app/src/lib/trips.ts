import { requireSupabase } from "./supabase";
import { tripDateTimes } from "./validation";
import type {
  CatalogItem,
  FishingTrip,
  FishingTripDiscovery,
  TripPrivateDetails,
  TripPrivateDetailsValues,
  TripParticipationRequest,
  TripParticipationStatus,
  TripDiscoveryFilters,
  TripEndPrecision,
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
  public_code: string;
  organizer_user_id: string;
  organizer_name: string;
  organizer_profile_photo_key: string | null;
  title: string;
  technique_id: number;
  technique_name: string;
  water_type: FishingTripDiscovery["waterType"];
  starts_at: string;
  ends_at: string;
  end_precision: TripEndPrecision;
  province_code: string;
  province_name: string;
  public_zone: string;
  max_participants: number;
  available_places: number;
  participant_count: number;
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
    p_zone: filters.zone.trim() || null,
    p_technique_id: filters.techniqueId || null,
    p_water_type: filters.waterType || null,
    p_starts_from: filters.date ? localDateBoundary(filters.date, 0) : null,
    p_starts_before: filters.date ? localDateBoundary(filters.date, 1) : null,
    p_limit: 50,
  };
}

export async function loadDiscoverableTrips(
  filters: TripDiscoveryFilters,
  userId: string,
): Promise<FishingTripDiscovery[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc(
    "search_fishing_trips",
    discoveryRpcArgs(filters),
  );

  if (error) throw error;
  const trips = ((data ?? []) as DiscoveryRow[]).map((row) => ({
    id: row.id,
    publicCode: row.public_code,
    organizerUserId: row.organizer_user_id,
    organizerName: row.organizer_name,
    organizerPhotoKey: row.organizer_profile_photo_key,
    organizerPhotoUrl: null,
    title: row.title,
    techniqueId: row.technique_id,
    techniqueName: row.technique_name,
    waterType: row.water_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    endPrecision: row.end_precision,
    provinceCode: row.province_code,
    provinceName: row.province_name,
    publicZone: row.public_zone,
    maxParticipants: row.max_participants,
    availablePlaces: row.available_places,
    participantCount: row.participant_count,
    recommendedLevel: row.recommended_level,
    description: row.description,
    tripType: row.trip_type,
    participationStatus: null,
  }));

  if (trips.length === 0) return trips;

  const tripsWithPhotos = await Promise.all(trips.map(async (trip) => {
    if (!trip.organizerPhotoKey) return trip;
    const { data: signedPhoto, error: photoError } = await supabase.storage
      .from("profile-photos")
      .createSignedUrl(trip.organizerPhotoKey, 300);
    return photoError || !signedPhoto?.signedUrl
      ? trip
      : { ...trip, organizerPhotoUrl: signedPhoto.signedUrl };
  }));

  const { data: participationData, error: participationError } = await supabase
    .from("trip_participants")
    .select("trip_id, status")
    .eq("user_id", userId)
    .in("trip_id", tripsWithPhotos.map((trip) => trip.id));

  if (participationError) throw participationError;
  return mergeParticipationStatuses(
    tripsWithPhotos,
    (participationData ?? []) as Array<{
      trip_id: string;
      status: TripParticipationStatus;
    }>,
  );
}

export function mergeParticipationStatuses(
  trips: FishingTripDiscovery[],
  participations: Array<{ trip_id: string; status: TripParticipationStatus }>,
) {
  const statusByTrip = new Map(
    participations.map((participation) => [
      participation.trip_id,
      participation.status,
    ]),
  );

  return trips.map((trip) => ({
    ...trip,
    participationStatus: statusByTrip.get(trip.id) ?? null,
  }));
}

type ParticipationActionRow = {
  participant_id: string;
  participation_status: TripParticipationStatus;
  requested_at: string;
};

async function participationAction(
  functionName: "request_trip_participation" | "cancel_trip_participation",
  tripId: string,
) {
  const { data, error } = await requireSupabase().rpc(functionName, {
    p_trip_id: tripId,
  });

  if (error) throw error;
  const result = ((data ?? []) as ParticipationActionRow[])[0];
  if (!result) throw new Error("La richiesta non ha restituito uno stato valido.");
  return result.participation_status;
}

export const MAX_REQUEST_MESSAGE_LENGTH = 300;

export function normalizeParticipationRequestMessage(message: string) {
  const normalized = message.trim();
  if (normalized.length > MAX_REQUEST_MESSAGE_LENGTH) {
    throw new Error(`Il messaggio può contenere al massimo ${MAX_REQUEST_MESSAGE_LENGTH} caratteri.`);
  }
  return normalized || null;
}

export async function requestTripParticipation(tripId: string, message = "") {
  const { data, error } = await requireSupabase().rpc("request_trip_participation", {
    p_trip_id: tripId,
    p_request_message: normalizeParticipationRequestMessage(message),
  });

  if (error) throw error;
  const result = ((data ?? []) as ParticipationActionRow[])[0];
  if (!result) throw new Error("La richiesta non ha restituito uno stato valido.");
  return result.participation_status;
}

export function cancelTripParticipation(tripId: string) {
  return participationAction("cancel_trip_participation", tripId);
}

type ParticipationManagementRow = {
  participant_id: string;
  participant_user_id: string;
  display_name: string;
  age_band: TripParticipationRequest["ageBand"];
  municipality_name: string | null;
  generic_zone: string | null;
  skill_level: TripParticipationRequest["skillLevel"];
  technique_names: string[] | null;
  water_type: TripParticipationRequest["waterType"];
  bio: string | null;
  profile_photo_key: string | null;
  request_message: string | null;
  participation_status: TripParticipationStatus;
  requested_at: string;
  decided_at: string | null;
};

export function mapParticipationManagementRow(
  row: ParticipationManagementRow,
): TripParticipationRequest {
  return {
    id: row.participant_id,
    userId: row.participant_user_id,
    displayName: row.display_name,
    ageBand: row.age_band,
    municipalityName: row.municipality_name,
    genericZone: row.generic_zone,
    skillLevel: row.skill_level,
    techniqueNames: row.technique_names ?? [],
    waterType: row.water_type,
    bio: row.bio,
    photoKey: row.profile_photo_key,
    photoUrl: null,
    requestMessage: row.request_message,
    status: row.participation_status,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at,
  };
}

export async function loadTripParticipationRequests(
  tripId: string,
): Promise<TripParticipationRequest[]> {
  const supabase = requireSupabase();
  const rows = await loadParticipationManagementRows(tripId);
  const requests = rows.map(mapParticipationManagementRow);

  return Promise.all(requests.map(async (request) => {
    if (!request.photoKey) return request;

    const { data: signedPhoto, error: photoError } = await supabase.storage
      .from("profile-photos")
      .createSignedUrl(request.photoKey, 300);

    return photoError || !signedPhoto?.signedUrl
      ? request
      : { ...request, photoUrl: signedPhoto.signedUrl };
  }));
}

async function loadParticipationManagementRows(tripId: string) {
  const { data, error } = await requireSupabase().rpc(
    "list_trip_participation_requests",
    { p_trip_id: tripId },
  );

  if (error) throw error;
  return (data ?? []) as ParticipationManagementRow[];
}

export type TripParticipationRequestSummary = {
  requested: number;
  accepted: number;
};

export async function loadTripParticipationRequestSummary(
  tripId: string,
): Promise<TripParticipationRequestSummary> {
  const rows = await loadParticipationManagementRows(tripId);

  return rows.reduce<TripParticipationRequestSummary>((summary, row) => {
    if (row.participation_status === "requested") summary.requested += 1;
    if (row.participation_status === "accepted") summary.accepted += 1;
    return summary;
  }, { requested: 0, accepted: 0 });
}

type ParticipationDecisionRow = {
  participant_id: string;
  participation_status: TripParticipationStatus;
  decided_at: string;
};

export async function decideTripParticipation(
  participantId: string,
  decision: "accepted" | "rejected",
) {
  const { data, error } = await requireSupabase().rpc(
    "decide_trip_participation",
    {
      p_participant_id: participantId,
      p_decision: decision,
    },
  );

  if (error) throw error;
  const result = ((data ?? []) as ParticipationDecisionRow[])[0];
  if (!result) throw new Error("La decisione non ha restituito uno stato valido.");
  return result;
}

export function mergeParticipationDecision(
  requests: TripParticipationRequest[],
  decision: ParticipationDecisionRow,
) {
  return requests.map((request) => request.id === decision.participant_id
    ? {
        ...request,
        status: decision.participation_status,
        decidedAt: decision.decided_at,
      }
    : request);
}

type TripConfirmationRow = {
  trip_status: "confirmed";
  confirmed_at: string;
  confirmed_participant_count: number;
};

export async function confirmFishingTrip(tripId: string) {
  const { data, error } = await requireSupabase().rpc("confirm_fishing_trip", {
    p_trip_id: tripId,
  });

  if (error) throw error;
  const result = ((data ?? []) as TripConfirmationRow[])[0];
  if (!result) throw new Error("La conferma non ha restituito uno stato valido.");
  return result;
}

const TRIP_SELECT = `
  id,
  public_code,
  organizer_user_id,
  title,
  title_is_custom,
  technique_id,
  water_type,
  starts_at,
  ends_at,
  end_precision,
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
  hidden_by_admin_at,
  hidden_by_admin_reason,
  created_at,
  updated_at,
  fishing_techniques (name)
`;

type TripRow = {
  id: string;
  public_code: string;
  organizer_user_id: string;
  title: string;
  title_is_custom: boolean;
  technique_id: number;
  water_type: FishingTrip["waterType"];
  starts_at: string;
  ends_at: string;
  end_precision: TripEndPrecision;
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
  hidden_by_admin_at: string | null;
  hidden_by_admin_reason: string | null;
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
    publicCode: row.public_code,
    organizerUserId: row.organizer_user_id,
    title: row.title,
    titleIsCustom: row.title_is_custom,
    techniqueId: row.technique_id,
    techniqueName: technique?.name ?? "Tecnica non disponibile",
    waterType: row.water_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    endPrecision: row.end_precision,
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
    hiddenByAdminAt: row.hidden_by_admin_at,
    hiddenByAdminReason: row.hidden_by_admin_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function writableTrip(values: TripValues) {
  const times = tripDateTimes(values);
  if (!times) throw new Error("Data o orario dell’uscita non validi.");

  return {
    title: values.title.trim(),
    title_is_custom: values.titleIsCustom,
    technique_id: values.techniqueId,
    water_type: values.waterType,
    starts_at: times.startsAt.toISOString(),
    ends_at: times.endsAt.toISOString(),
    end_precision: times.endPrecision,
    province_code: values.provinceCode,
    public_zone: values.publicZone.trim(),
    public_meeting_point: values.tripType === "free"
      ? values.publicMeetingPoint.trim() || null
      : null,
    max_participants: values.maxParticipants,
    recommended_level: values.recommendedLevel,
    description: values.description.trim(),
    gear_notes: null,
    trip_type: values.tripType,
  };
}

export async function createFishingTrip(organizerUserId: string, values: TripValues) {
  const { data, error } = await requireSupabase().from("fishing_trips").insert({
    organizer_user_id: organizerUserId,
    municipality_code: null,
    ...writableTrip(values),
    status: "open",
  }).select("id, public_code").single();

  if (error) throw error;
  return { id: data.id as string, publicCode: data.public_code as string };
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

type HiddenTripRow = {
  trip_id: string;
};

export async function loadMyHiddenTripIds(): Promise<Set<string>> {
  const { data, error } = await requireSupabase().rpc("list_my_hidden_trip_ids");
  if (error) throw error;
  return new Set(((data ?? []) as HiddenTripRow[]).map((row) => row.trip_id));
}

export async function setTripHistoryHidden(tripId: string, hidden: boolean) {
  const { error } = await requireSupabase().rpc("set_my_trip_history_hidden", {
    p_trip_id: tripId,
    p_hidden: hidden,
  });
  if (error) throw error;
}

export async function deleteFishingTripDraft(tripId: string) {
  const { data, error } = await requireSupabase().rpc("delete_my_fishing_trip_draft", {
    p_trip_id: tripId,
  });
  if (error) throw error;
  return data as string;
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

export async function loadFishingTripForViewer(tripId: string): Promise<FishingTrip> {
  const { data, error } = await requireSupabase()
    .from("fishing_trips")
    .select(TRIP_SELECT)
    .eq("id", tripId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Uscita non trovata o non accessibile.");
  return mapTrip(data as unknown as TripRow);
}

type PrivateDetailsRow = {
  trip_id: string;
  meeting_point_text: string;
  exact_lat: number | string | null;
  exact_lon: number | string | null;
  private_notes: string | null;
  updated_at: string;
};

function mapPrivateDetails(row: PrivateDetailsRow): TripPrivateDetails {
  return {
    tripId: row.trip_id,
    meetingPointText: row.meeting_point_text,
    exactLat: row.exact_lat === null ? null : Number(row.exact_lat),
    exactLon: row.exact_lon === null ? null : Number(row.exact_lon),
    privateNotes: row.private_notes,
    updatedAt: row.updated_at,
  };
}

export async function loadTripPrivateDetails(
  tripId: string,
): Promise<TripPrivateDetails | null> {
  const { data, error } = await requireSupabase()
    .from("trip_private_details")
    .select("trip_id, meeting_point_text, exact_lat, exact_lon, private_notes, updated_at")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPrivateDetails(data as PrivateDetailsRow) : null;
}

export async function saveTripPrivateDetails(
  tripId: string,
  values: TripPrivateDetailsValues,
): Promise<TripPrivateDetails> {
  const hasCoordinates = values.exactLat.trim() && values.exactLon.trim();
  const writableDetails = {
    meeting_point_text: values.meetingPointText.trim(),
    exact_lat: hasCoordinates ? Number(values.exactLat) : null,
    exact_lon: hasCoordinates ? Number(values.exactLon) : null,
    private_notes: values.privateNotes.trim() || null,
  };
  const supabase = requireSupabase();
  const { data: updated, error: updateError } = await supabase
    .from("trip_private_details")
    .update(writableDetails)
    .eq("trip_id", tripId)
    .select("trip_id, meeting_point_text, exact_lat, exact_lon, private_notes, updated_at")
    .maybeSingle();

  if (updateError) throw updateError;
  if (updated) return mapPrivateDetails(updated as PrivateDetailsRow);

  const { data: inserted, error: insertError } = await supabase
    .from("trip_private_details")
    .insert({ trip_id: tripId, ...writableDetails })
    .select("trip_id, meeting_point_text, exact_lat, exact_lon, private_notes, updated_at")
    .single();

  if (insertError) throw insertError;
  return mapPrivateDetails(inserted as PrivateDetailsRow);
}

export function privateDetailsToValues(
  details: TripPrivateDetails | null,
): TripPrivateDetailsValues {
  return {
    meetingPointText: details?.meetingPointText ?? "",
    exactLat: details?.exactLat === null || details?.exactLat === undefined
      ? ""
      : String(details.exactLat),
    exactLon: details?.exactLon === null || details?.exactLon === undefined
      ? ""
      : String(details.exactLon),
    privateNotes: details?.privateNotes ?? "",
  };
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

export type TripOrganizerSummary = {
  userId: string;
  displayName: string;
  photoKey: string | null;
  photoUrl: string | null;
};

export async function loadTripOrganizerSummary(
  tripId: string,
): Promise<TripOrganizerSummary | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("get_trip_organizer_summary", {
    p_trip_id: tripId,
  });
  if (error) throw error;
  const row = ((data ?? []) as Array<{
    user_id: string;
    display_name: string;
    profile_photo_key: string | null;
  }>)[0];
  if (!row) return null;

  let photoUrl: string | null = null;
  if (row.profile_photo_key) {
    const { data: signedPhoto, error: photoError } = await supabase.storage
      .from("profile-photos")
      .createSignedUrl(row.profile_photo_key, 300);
    if (!photoError) photoUrl = signedPhoto?.signedUrl ?? null;
  }

  return {
    userId: row.user_id,
    displayName: row.display_name,
    photoKey: row.profile_photo_key,
    photoUrl,
  };
}

export type TripGroupMember = {
  userId: string;
  displayName: string;
  role: "organizer" | "participant";
  participationStatus: TripParticipationStatus | null;
};

export async function loadTripGroupMembers(tripId: string): Promise<TripGroupMember[]> {
  const { data, error } = await requireSupabase().rpc("list_trip_group_members", {
    p_trip_id: tripId,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{
    user_id: string;
    display_name: string;
    member_role: "organizer" | "participant";
    participation_status: TripParticipationStatus | null;
  }>).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    role: row.member_role,
    participationStatus: row.participation_status,
  }));
}
function localPart(value: number) {
  return String(value).padStart(2, "0");
}

export function tripToValues(trip: FishingTrip): TripValues {
  const startsAt = new Date(trip.startsAt);
  const endsAt = new Date(trip.endsAt);
  const sameDay = startsAt.getFullYear() === endsAt.getFullYear()
    && startsAt.getMonth() === endsAt.getMonth()
    && startsAt.getDate() === endsAt.getDate();
  const endMode = trip.endPrecision === "date"
    ? (sameDay ? "flexible" : "another_day")
    : (sameDay ? "same_day" : "another_day");
  const legacyDetails = [trip.description.trim(), trip.gearNotes?.trim()]
    .filter(Boolean)
    .join("\n\n");

  return {
    title: trip.title,
    titleIsCustom: trip.titleIsCustom,
    techniqueId: trip.techniqueId,
    waterType: trip.waterType,
    date: `${startsAt.getFullYear()}-${localPart(startsAt.getMonth() + 1)}-${localPart(startsAt.getDate())}`,
    startTime: `${localPart(startsAt.getHours())}:${localPart(startsAt.getMinutes())}`,
    endMode,
    endDate: endMode === "another_day"
      ? `${endsAt.getFullYear()}-${localPart(endsAt.getMonth() + 1)}-${localPart(endsAt.getDate())}`
      : "",
    endTime: trip.endPrecision === "datetime"
      ? `${localPart(endsAt.getHours())}:${localPart(endsAt.getMinutes())}`
      : "",
    provinceCode: trip.provinceCode,
    publicZone: trip.publicZone,
    publicMeetingPoint: trip.publicMeetingPoint ?? "",
    maxParticipants: trip.maxParticipants,
    recommendedLevel: trip.recommendedLevel,
    description: legacyDetails,
    gearNotes: "",
    tripType: trip.tripType,
  };
}