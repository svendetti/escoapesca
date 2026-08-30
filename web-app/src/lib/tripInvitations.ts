import { requireSupabase } from "./supabase";

export type TripInviteCandidate = {
  userId: string;
  displayName: string;
  municipalityName: string;
  genericZone: string | null;
  skillLevel: "beginner" | "intermediate" | "expert";
  waterType: "sea" | "freshwater" | "both";
  techniqueNames: string[];
  alreadyInvited: boolean;
};

type CandidateRow = {
  user_id: string;
  display_name: string;
  municipality_name: string;
  generic_zone: string | null;
  skill_level: TripInviteCandidate["skillLevel"];
  water_type: TripInviteCandidate["waterType"];
  technique_names: string[] | null;
  already_invited: boolean;
};

export async function loadTripInviteCandidates(tripId: string, search = "") {
  const { data, error } = await requireSupabase().rpc("list_trip_invite_candidates", {
    p_trip_id: tripId,
    p_search: search.trim() || null,
    p_limit: 8,
  });
  if (error) throw error;
  return ((data ?? []) as CandidateRow[]).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    municipalityName: row.municipality_name,
    genericZone: row.generic_zone,
    skillLevel: row.skill_level,
    waterType: row.water_type,
    techniqueNames: row.technique_names ?? [],
    alreadyInvited: row.already_invited,
  }));
}

export async function sendTripInvitation(tripId: string, inviteeUserId: string) {
  const { data, error } = await requireSupabase().rpc("send_trip_invitation", {
    p_trip_id: tripId,
    p_invitee_user_id: inviteeUserId,
  });
  if (error) throw error;
  const row = (data?.[0] ?? null) as { invitation_id?: string; sent_now?: boolean } | null;
  return { invitationId: row?.invitation_id ?? null, sentNow: Boolean(row?.sent_now) };
}
