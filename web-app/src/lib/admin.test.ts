import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("./supabase", () => ({ requireSupabase: () => ({ rpc }) }));

import {
  ADMIN_RESET_CONFIRMATION,
  betaGoalProgress,
  formatDecimal,
  formatRatio,
  loadAdminDashboard,
  resetAdminOperationalData,
} from "./admin";

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

  it("formatta le medie senza trasformare un dato assente in zero", () => {
    expect(formatDecimal(4.25)).toBe("4.3");
    expect(formatDecimal(1.375, 2)).toBe("1.38");
    expect(formatDecimal(null)).toBe("—");
  });

  it("mappa il payload protetto della dashboard", async () => {
    rpc.mockResolvedValue({ data: {
      metrics: {
        registered_users: 4,
        real_trips: 1,
        registered_to_participation_ratio: "0.25",
        active_users: 3,
        new_users_7_days: 2,
        active_trips: 4,
        pending_requests: 5,
        average_rating: "4.25",
        feedback_completion_ratio: "0.75",
        average_requests_per_trip: "1.5",
      },
      users: [{ id: "u1", email: "a@example.it", display_name: "Ada", status: "active", created_at: "2026-01-01" }],
      trips: [], participations: [], feedback: [], actions: [],
    }, error: null });

    const dashboard = await loadAdminDashboard();
    expect(rpc).toHaveBeenCalledWith("get_admin_dashboard", { p_limit: 100 });
    expect(dashboard.metrics.registeredUsers).toBe(4);
    expect(dashboard.metrics.registeredToParticipationRatio).toBe(0.25);
    expect(dashboard.metrics.activeUsers).toBe(3);
    expect(dashboard.metrics.newUsers7Days).toBe(2);
    expect(dashboard.metrics.activeTrips).toBe(4);
    expect(dashboard.metrics.pendingRequests).toBe(5);
    expect(dashboard.metrics.averageRating).toBe(4.25);
    expect(dashboard.metrics.feedbackCompletionRatio).toBe(0.75);
    expect(dashboard.metrics.averageRequestsPerTrip).toBe(1.5);
    expect(dashboard.users[0].displayName).toBe("Ada");
  });

  it("richiede la conferma esplicita e mappa il risultato del reset", async () => {
    rpc.mockResolvedValue({
      data: {
        users_preserved: 4,
        trips_deleted: 3,
        participations_deleted: 2,
        private_details_deleted: 1,
        feedback_deleted: 1,
        notifications_deleted: 5,
        events_deleted: 6,
        email_deliveries_deleted: 4,
        admin_actions_deleted: 0,
        operational_rows_deleted: 22,
      },
      error: null,
    });

    const result = await resetAdminOperationalData(` ${ADMIN_RESET_CONFIRMATION} `);

    expect(rpc).toHaveBeenCalledWith("admin_reset_operational_data", {
      p_confirmation: ADMIN_RESET_CONFIRMATION,
    });
    expect(result).toMatchObject({
      usersPreserved: 4,
      tripsDeleted: 3,
      operationalRowsDeleted: 22,
    });
  });
});
