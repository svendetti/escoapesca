import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("./supabase", () => ({ requireSupabase: () => ({ rpc }) }));

import { betaGoalProgress, formatRatio, loadAdminDashboard } from "./admin";

describe("admin helpers", () => {
  beforeEach(() => rpc.mockReset());

  it("calcola il progresso verso le 5 uscite reali", () => {
    expect(betaGoalProgress(0)).toBe(0);
    expect(betaGoalProgress(3)).toBe(60);
    expect(betaGoalProgress(8)).toBe(100);
  });

  it("formatta i rapporti senza inventare valori mancanti", () => {
    expect(formatRatio(0.25)).toBe("25%");
    expect(formatRatio(null)).toBe("—");
  });

  it("mappa il payload protetto della dashboard", async () => {
    rpc.mockResolvedValue({ data: {
      metrics: { registered_users: 4, real_trips: 1, registered_to_participation_ratio: "0.25" },
      users: [{ id: "u1", email: "a@example.it", display_name: "Ada", status: "active", created_at: "2026-01-01" }],
      trips: [], participations: [], feedback: [], actions: [],
    }, error: null });

    const dashboard = await loadAdminDashboard();
    expect(rpc).toHaveBeenCalledWith("get_admin_dashboard", { p_limit: 100 });
    expect(dashboard.metrics.registeredUsers).toBe(4);
    expect(dashboard.metrics.registeredToParticipationRatio).toBe(0.25);
    expect(dashboard.users[0].displayName).toBe("Ada");
  });
});
