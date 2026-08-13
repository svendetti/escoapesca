import { requireSupabase } from "./supabase";
import { tripDateTimes } from "./validation";
import type { CatalogItem, TripValues } from "../types/domain";

export async function loadFishingTechniques(): Promise<CatalogItem[]> {
  const { data, error } = await requireSupabase()
    .from("fishing_techniques")
    .select("id, slug, name")
    .order("sort_order");

  if (error) throw error;
  return data.map((item) => ({ id: item.id, slug: item.slug, label: item.name }));
}

export async function createFishingTrip(organizerUserId: string, values: TripValues) {
  const times = tripDateTimes(values);
  if (!times) throw new Error("Data o orario dell’uscita non validi.");

  const { error } = await requireSupabase().from("fishing_trips").insert({
    organizer_user_id: organizerUserId,
    title: values.title.trim(),
    technique_id: values.techniqueId,
    water_type: values.waterType,
    starts_at: times.startsAt.toISOString(),
    ends_at: times.endsAt.toISOString(),
    province_code: values.provinceCode,
    municipality_code: null,
    public_zone: values.publicZone.trim(),
    public_meeting_point: values.tripType === "free"
      ? values.publicMeetingPoint.trim() || null
      : null,
    max_participants: values.maxParticipants,
    recommended_level: values.recommendedLevel,
    description: values.description.trim(),
    gear_notes: values.gearNotes.trim() || null,
    trip_type: values.tripType,
    status: "open",
  });

  if (error) throw error;
}
