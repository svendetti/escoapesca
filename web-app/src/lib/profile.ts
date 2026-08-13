import { requireSupabase } from "./supabase";
import type { CatalogItem, ProfileValues } from "../types/domain";

type ProfileRow = {
  province_code: string;
  municipality_name: string;
  generic_zone: string | null;
  age_band: ProfileValues["ageBand"];
  bio: string | null;
  water_type: Exclude<ProfileValues["waterType"], ""> | null;
  skill_level: Exclude<ProfileValues["skillLevel"], ""> | null;
  travel_radius_km: number | null;
  profile_photo_key: string | null;
  completed_at: string | null;
};

export type LoadedProfile = {
  values: ProfileValues;
  photoKey: string | null;
  completedAt: string | null;
};

export async function loadCatalogs() {
  const client = requireSupabase();
  const [techniquesResult, availabilityResult] = await Promise.all([
    client.from("fishing_techniques").select("id, slug, name").order("sort_order"),
    client.from("availability_slots").select("id, slug, label").order("sort_order"),
  ]);

  if (techniquesResult.error) throw techniquesResult.error;
  if (availabilityResult.error) throw availabilityResult.error;

  return {
    techniques: techniquesResult.data.map((item) => ({
      id: item.id,
      slug: item.slug,
      label: item.name,
    })) satisfies CatalogItem[],
    availability: availabilityResult.data.map((item) => ({
      id: item.id,
      slug: item.slug,
      label: item.label,
    })) satisfies CatalogItem[],
  };
}

export async function loadProfile(userId: string): Promise<LoadedProfile> {
  const client = requireSupabase();
  const [userResult, profileResult, techniquesResult, availabilityResult] = await Promise.all([
    client.from("app_users").select("display_name").eq("id", userId).single(),
    client.from("fisher_profiles").select(
      "province_code, municipality_name, generic_zone, age_band, bio, water_type, skill_level, travel_radius_km, profile_photo_key, completed_at",
    ).eq("user_id", userId).single(),
    client.from("user_fishing_techniques").select("technique_id").eq("user_id", userId),
    client.from("user_availability").select("availability_slot_id").eq("user_id", userId),
  ]);

  if (userResult.error) throw userResult.error;
  if (profileResult.error) throw profileResult.error;
  if (techniquesResult.error) throw techniquesResult.error;
  if (availabilityResult.error) throw availabilityResult.error;

  const profile = profileResult.data as ProfileRow;
  return {
    values: {
      displayName: userResult.data.display_name,
      provinceCode: profile.province_code,
      municipalityName: profile.municipality_name,
      genericZone: profile.generic_zone ?? "",
      ageBand: profile.age_band,
      bio: profile.bio ?? "",
      waterType: profile.water_type ?? "",
      skillLevel: profile.skill_level ?? "",
      travelRadiusKm: profile.travel_radius_km === null
        ? ""
        : String(profile.travel_radius_km) as ProfileValues["travelRadiusKm"],
      techniqueIds: techniquesResult.data.map((row) => row.technique_id),
      availabilitySlotIds: availabilityResult.data.map((row) => row.availability_slot_id),
    },
    photoKey: profile.profile_photo_key,
    completedAt: profile.completed_at,
  };
}

export async function saveProfile(values: ProfileValues) {
  const client = requireSupabase();
  const { error } = await client.rpc("save_fisher_profile", {
    p_display_name: values.displayName.trim(),
    p_province_code: values.provinceCode,
    p_municipality_name: values.municipalityName.trim(),
    p_generic_zone: values.genericZone.trim(),
    p_age_band: values.ageBand,
    p_bio: values.bio.trim(),
    p_water_type: values.waterType,
    p_skill_level: values.skillLevel,
    p_travel_radius_km: values.travelRadiusKm ? Number(values.travelRadiusKm) : null,
    p_technique_ids: values.techniqueIds,
    p_availability_slot_ids: values.availabilitySlotIds,
  });

  if (error) throw error;
}

export async function uploadProfilePhoto(userId: string, file: File) {
  const client = requireSupabase();
  const key = `${userId}/avatar`;
  const { error: uploadError } = await client.storage
    .from("profile-photos")
    .upload(key, file, { contentType: file.type, upsert: true });
  if (uploadError) throw uploadError;

  const { error: profileError } = await client
    .from("fisher_profiles")
    .update({ profile_photo_key: key })
    .eq("user_id", userId);
  if (profileError) throw profileError;

  return key;
}

export async function downloadProfilePhoto(key: string) {
  const { data, error } = await requireSupabase().storage.from("profile-photos").download(key);
  if (error) throw error;
  return URL.createObjectURL(data);
}
