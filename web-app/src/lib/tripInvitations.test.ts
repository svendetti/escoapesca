import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));

import { loadTripInviteCandidates } from "./tripInvitations";
import { requireSupabase } from "./supabase";

describe("trip invitation candidates", () => {
  it("restituisce una lista compatta filtrata dalla ricerca", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        user_id: "user-1",
        display_name: "Simone",
        municipality_name: "Roma",
        generic_zone: "Ostia",
        skill_level: "intermediate",
        water_type: "sea",
        technique_names: ["Spinning"],
        already_invited: false,
      }],
      error: null,
    });
    vi.mocked(requireSupabase).mockReturnValue({ rpc } as never);

    await expect(loadTripInviteCandidates("trip-1", "  Simo  ")).resolves.toEqual([
      expect.objectContaining({
        userId: "user-1",
        displayName: "Simone",
        alreadyInvited: false,
      }),
    ]);
    expect(rpc).toHaveBeenCalledWith("list_trip_invite_candidates", {
      p_trip_id: "trip-1",
      p_search: "Simo",
      p_limit: 8,
    });
  });
});
