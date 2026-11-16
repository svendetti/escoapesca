import { describe, expect, it, vi } from "vitest";
vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));
import { requireSupabase } from "./supabase";
import { loadTripPreview, tripDetailsPath, tripPreviewPath } from "./tripPreview";

describe("internal trip destinations", () => {
  it.each(["requested", "accepted"] as const)("keeps %s participants inside the app", (participationStatus) => {
    expect(tripDetailsPath({ id: "trip-1", role: "participant", status: "open", participationStatus }))
      .toBe("/uscite/trip-1/scheda");
  });
  it("keeps accepted participants on public data even when the trip has been confirmed", () => {
    expect(tripDetailsPath({ id: "trip-1", role: "participant", status: "confirmed", participationStatus: "accepted" }))
      .toBe("/uscite/trip-1/scheda");
  });
  it("preserves organizer and confirmed participant detail routes", () => {
    expect(tripDetailsPath({ id: "trip-1", role: "organizer", status: "open", participationStatus: null })).toBe("/uscite/trip-1");
    expect(tripDetailsPath({ id: "trip-1", role: "participant", status: "confirmed", participationStatus: "confirmed" })).toBe("/uscite/trip-1");
    expect(tripPreviewPath("a/b?c")).toBe("/uscite/a%2Fb%3Fc/scheda");
  });
});

describe("public-data preview inside the app", () => {
  it("uses only the public RPC and maps an explicit allowlist, excluding private fields", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{
      id: "trip-1", title: "Uscita", public_zone: "Zona generica", trip_type: "protected",
      exact_lat: 41.1, exact_lon: 12.1, meeting_point_text: "Segreto", private_notes: "Segrete",
    }], error: null });
    vi.mocked(requireSupabase).mockReturnValue({ rpc } as never);
    const trip = await loadTripPreview("trip-1");
    expect(rpc).toHaveBeenCalledWith("get_public_fishing_trip", { p_trip_id: "trip-1" });
    expect(trip?.publicZone).toBe("Zona generica");
    for (const key of ["exact_lat", "exact_lon", "meeting_point_text", "private_notes", "exactLat", "privateNotes"]) {
      expect(trip).not.toHaveProperty(key);
    }
  });
  it("returns an unavailable state for an absent public row and propagates query errors", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("Rete non disponibile") });
    vi.mocked(requireSupabase).mockReturnValue({ rpc } as never);
    await expect(loadTripPreview("trip-1")).resolves.toBeNull();
    await expect(loadTripPreview("trip-1")).rejects.toThrow("Rete non disponibile");
  });
});
