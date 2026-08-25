import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));
import {
  discoveryRpcArgs,
  mergeParticipationDecision,
  mergeParticipationStatuses,
} from "./trips";
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
