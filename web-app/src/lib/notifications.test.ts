import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));
import { notificationCopy } from "./notifications";
import type { AppNotification } from "../types/domain";

function notification(type: AppNotification["type"]): AppNotification {
  return {
    id: "notification-1",
    type,
    tripId: "trip-1",
    tripTitle: "Spinning a Ostia",
    actorName: "Mario",
    readAt: null,
    createdAt: "2026-08-25T10:00:00.000Z",
  };
}

describe("notificationCopy", () => {
  it("porta l'organizzatore alla gestione della richiesta", () => {
    expect(notificationCopy(notification("participation_requested")).target).toBe("/uscite/trip-1");
  });

  it("non inserisce dettagli privati nella conferma", () => {
    const copy = notificationCopy(notification("trip_confirmed"));
    expect(copy.message).toContain("dettagli privati");
    expect(copy.message).not.toContain("coordinate");
  });

  it("non collega una uscita annullata non più accessibile", () => {
    expect(notificationCopy(notification("trip_cancelled")).target).toBeNull();
  });
});
