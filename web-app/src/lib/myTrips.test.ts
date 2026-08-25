import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));
import { dashboardTripBucket, tripTimePhase } from "./myTrips";

const NOW = new Date("2026-08-25T10:00:00.000Z").getTime();

describe("tripTimePhase", () => {
  it("usa la fine dell’uscita per distinguere in corso e passata", () => {
    expect(tripTimePhase(
      "2026-08-25T08:00:00.000Z",
      "2026-08-25T12:00:00.000Z",
      NOW,
    )).toBe("in_progress");
    expect(tripTimePhase(
      "2026-08-25T06:00:00.000Z",
      "2026-08-25T09:59:59.000Z",
      NOW,
    )).toBe("past");
  });
});

describe("dashboardTripBucket", () => {
  it("mantiene separate le uscite attive organizzate e partecipate", () => {
    expect(dashboardTripBucket(
      "organizer",
      "2026-08-26T08:00:00.000Z",
      "2026-08-26T12:00:00.000Z",
      "open",
      null,
      NOW,
    )).toBe("organized");
    expect(dashboardTripBucket(
      "participant",
      "2026-08-26T08:00:00.000Z",
      "2026-08-26T12:00:00.000Z",
      "open",
      "accepted",
      NOW,
    )).toBe("participating");
  });

  it("archivia dopo ends_at e gli stati conclusi senza inventare completed", () => {
    expect(dashboardTripBucket(
      "organizer",
      "2026-08-25T06:00:00.000Z",
      "2026-08-25T09:00:00.000Z",
      "confirmed",
      null,
      NOW,
    )).toBe("past");
    expect(dashboardTripBucket(
      "participant",
      "2026-08-26T08:00:00.000Z",
      "2026-08-26T12:00:00.000Z",
      "open",
      "rejected",
      NOW,
    )).toBe("past");
  });
});
