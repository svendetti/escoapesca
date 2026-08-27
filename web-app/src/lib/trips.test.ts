import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));
import {
  discoveryRpcArgs,
  loadTripParticipationRequests,
  mapParticipationManagementRow,
  mergeParticipationDecision,
  mergeParticipationStatuses,
  normalizeParticipationRequestMessage,
} from "./trips";
import { requireSupabase } from "./supabase";
import type {
  FishingTripDiscovery,
  TripParticipationRequest,
} from "../types/domain";

describe("discoveryRpcArgs", () => {
  it("invia filtri vuoti come null", () => {
    expect(discoveryRpcArgs({ provinceCode: "", zone: "", techniqueId: "", waterType: "", date: "" })).toEqual({
      p_province_code: null,
      p_zone: null,
      p_technique_id: null,
      p_water_type: null,
      p_starts_from: null,
      p_starts_before: null,
      p_limit: 50,
    });
  });

  it("converte una data locale in un intervallo di un giorno", () => {
    const args = discoveryRpcArgs({ provinceCode: "RM", zone: " Ostia ", techniqueId: 3, waterType: "sea", date: "2026-09-14" });
    const from = new Date(args.p_starts_from!);
    const before = new Date(args.p_starts_before!);

    expect(args.p_province_code).toBe("RM");
    expect(args.p_zone).toBe("Ostia");
    expect(args.p_technique_id).toBe(3);
    expect(args.p_water_type).toBe("sea");
    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(8);
    expect(from.getDate()).toBe(14);
    expect(before.getDate()).toBe(15);
  });
});

describe("mergeParticipationStatuses", () => {
  it("associa soltanto lo stato della richiesta relativo alla stessa uscita", () => {
    const trip = {
      id: "trip-1",
      participationStatus: null,
    } as FishingTripDiscovery;

    expect(mergeParticipationStatuses(
      [trip],
      [
        { trip_id: "trip-1", status: "requested" },
        { trip_id: "trip-2", status: "cancelled" },
      ],
    )[0].participationStatus).toBe("requested");
  });

  it("mantiene null quando non esiste una richiesta", () => {
    const trip = {
      id: "trip-1",
      participationStatus: null,
    } as FishingTripDiscovery;

    expect(mergeParticipationStatuses([trip], [])[0].participationStatus).toBeNull();
  });
});

describe("mergeParticipationDecision", () => {
  it("aggiorna soltanto la richiesta decisa", () => {
    const requests = [
      { id: "participant-1", status: "requested", decidedAt: null },
      { id: "participant-2", status: "requested", decidedAt: null },
    ] as TripParticipationRequest[];

    const updated = mergeParticipationDecision(requests, {
      participant_id: "participant-1",
      participation_status: "accepted",
      decided_at: "2026-08-20T15:00:00.000Z",
    });

    expect(updated[0].status).toBe("accepted");
    expect(updated[0].decidedAt).toBe("2026-08-20T15:00:00.000Z");
    expect(updated[1].status).toBe("requested");
  });
});

describe("mapParticipationManagementRow", () => {
  it("mappa soltanto i campi del mini-profilo autorizzato", () => {
    const request = mapParticipationManagementRow({
      participant_id: "participant-1",
      participant_user_id: "user-1",
      display_name: "Luca",
      age_band: "35_44",
      municipality_name: "Roma",
      generic_zone: "Litorale",
      skill_level: "intermediate",
      technique_names: ["Spinning", "Surfcasting"],
      water_type: "sea",
      bio: "Pesco nel weekend.",
      profile_photo_key: "user-1/avatar",
      request_message: "Ci vediamo sul posto.",
      participation_status: "requested",
      requested_at: "2026-08-20T14:00:00.000Z",
      decided_at: null,
    });

    expect(request).toMatchObject({
      id: "participant-1",
      displayName: "Luca",
      municipalityName: "Roma",
      techniqueNames: ["Spinning", "Surfcasting"],
      photoKey: "user-1/avatar",
      photoUrl: null,
      requestMessage: "Ci vediamo sul posto.",
    });
    expect(request).not.toHaveProperty("email");
    expect(request).not.toHaveProperty("phone");
  });

  it("firma la foto privata per cinque minuti", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.test/temporary-photo" },
      error: null,
    });
    vi.mocked(requireSupabase).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: [{
          participant_id: "participant-1",
          participant_user_id: "user-1",
          display_name: "Luca",
          age_band: null,
          municipality_name: null,
          generic_zone: null,
          skill_level: null,
          technique_names: [],
          water_type: null,
          bio: null,
          profile_photo_key: "user-1/avatar",
          request_message: null,
          participation_status: "requested",
          requested_at: "2026-08-20T14:00:00.000Z",
          decided_at: null,
        }],
        error: null,
      }),
      storage: {
        from: vi.fn().mockReturnValue({ createSignedUrl }),
      },
    } as never);

    const [request] = await loadTripParticipationRequests("trip-1");

    expect(createSignedUrl).toHaveBeenCalledWith("user-1/avatar", 300);
    expect(request.photoUrl).toBe("https://example.test/temporary-photo");
  });
});

describe("normalizeParticipationRequestMessage", () => {
  it("applica trim e converte il vuoto in null", () => {
    expect(normalizeParticipationRequestMessage("  Ci sono!  ")).toBe("Ci sono!");
    expect(normalizeParticipationRequestMessage("   ")).toBeNull();
  });

  it("rifiuta messaggi oltre 300 caratteri", () => {
    expect(() => normalizeParticipationRequestMessage("a".repeat(301))).toThrow(/300/);
    expect(normalizeParticipationRequestMessage("a".repeat(300))).toHaveLength(300);
  });
});
