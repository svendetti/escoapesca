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

  it("distingue l'accettazione dalla conferma e apre l'uscita corretta", () => {
    const copy = notificationCopy(notification("participation_accepted"));
    expect(copy.title).toContain("in attesa di conferma");
    expect(copy.message).toContain("deve ancora confermare");
    expect(copy.target).toBe("/uscite/trip-1");
  });

  it("spiega oscuramento e ripristino senza dichiarare l’identità verificata", () => {
    const hidden = notificationCopy(notification("trip_hidden_by_admin"));
    const restored = notificationCopy(notification("trip_restored_by_admin"));
    expect(hidden.title).toContain("oscurata");
    expect(hidden.target).toBe("/uscite/trip-1");
    expect(restored.title).toContain("ripristinata");
  });

  it("porta richiesta e reminder alla pagina feedback", () => {
    expect(notificationCopy(notification("feedback_requested")).target).toBe("/uscite/trip-1/feedback");
    expect(notificationCopy(notification("feedback_reminder")).target).toBe("/uscite/trip-1/feedback");
  });
});
