import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));
import { buildHomeDashboard, homeDiscoveryPreview } from "./homeDashboard";
import type { FishingTripParticipation } from "./myTrips";
import type {
  AppNotification,
  FishingTrip,
  FishingTripDiscovery,
} from "../types/domain";

const NOW = new Date("2026-08-27T10:00:00.000Z").getTime();

function organized(overrides: Partial<FishingTrip> = {}): FishingTrip {
  return {
    id: "organized-1",
    organizerUserId: "user-1",
    title: "Spinning al tramonto",
    techniqueId: 1,
    techniqueName: "Spinning",
    waterType: "sea",
    startsAt: "2026-08-28T16:00:00.000Z",
    endsAt: "2026-08-28T20:00:00.000Z",
    provinceCode: "RM",
    publicZone: "Ostia",
    publicMeetingPoint: null,
    maxParticipants: 3,
    recommendedLevel: "any",
    description: "Uscita",
    gearNotes: null,
    tripType: "free",
    status: "open",
    cancelledAt: null,
    cancellationReason: null,
    hiddenByAdminAt: null,
    hiddenByAdminReason: null,
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
    ...overrides,
  };
}

function participating(
  overrides: Partial<FishingTripParticipation> = {},
): FishingTripParticipation {
  return {
    participantId: "participant-1",
    participationStatus: "accepted",
    requestedAt: "2026-08-20T10:00:00.000Z",
    participantUpdatedAt: "2026-08-20T10:00:00.000Z",
    id: "participating-1",
    organizerUserId: "organizer-2",
    organizerName: "Ada",
    title: "Bolognese sul Tevere",
    techniqueId: 2,
    techniqueName: "Bolognese",
    waterType: "freshwater",
    startsAt: "2026-08-29T06:00:00.000Z",
    endsAt: "2026-08-29T10:00:00.000Z",
    provinceCode: "RM",
    publicZone: "Tevere nord",
    maxParticipants: 4,
    recommendedLevel: "any",
    tripType: "free",
    status: "open",
    ...overrides,
  };
}

describe("buildHomeDashboard", () => {
  it("mette il feedback prima delle richieste da valutare", () => {
    const past = organized({
      id: "past-trip",
      startsAt: "2026-08-26T06:00:00.000Z",
      endsAt: "2026-08-26T10:00:00.000Z",
      status: "confirmed",
    });
    const active = organized({ id: "active-trip" });

    const result = buildHomeDashboard({
      organized: [past, active],
      participating: [],
      feedbackTripIds: new Set(),
      requestSummaries: new Map([["active-trip", { requested: 2, accepted: 0 }]]),
      notifications: [],
      now: NOW,
    });

    expect(result.actions.map((action) => action.title).slice(0, 2)).toEqual([
      "Lascia il feedback",
      "2 richieste da valutare",
    ]);
  });

  it("non propone feedback già inviato e rende evidente la conferma gruppo", () => {
    const past = organized({
      id: "past-trip",
      startsAt: "2026-08-26T06:00:00.000Z",
      endsAt: "2026-08-26T10:00:00.000Z",
      status: "completed",
    });
    const active = organized({ id: "active-trip" });

    const result = buildHomeDashboard({
      organized: [past, active],
      participating: [],
      feedbackTripIds: new Set(["past-trip"]),
      requestSummaries: new Map([["active-trip", { requested: 0, accepted: 1 }]]),
      notifications: [],
      now: NOW,
    });

    expect(result.actions[0].title).toBe("Conferma il gruppo");
    expect(result.actions.some((action) => action.title === "Lascia il feedback")).toBe(false);
  });

  it("sceglie la prossima uscita reale e ordina lo stato accettato dopo le urgenze", () => {
    const accepted = participating();
    const later = organized({
      id: "later-trip",
      startsAt: "2026-08-30T08:00:00.000Z",
      endsAt: "2026-08-30T12:00:00.000Z",
    });

    const result = buildHomeDashboard({
      organized: [later],
      participating: [accepted],
      feedbackTripIds: new Set(),
      requestSummaries: new Map(),
      notifications: [],
      now: NOW,
    });

    expect(result.nextTrip?.id).toBe("participating-1");
    expect(result.actions[0].title).toBe("La tua richiesta è stata accettata");
    expect(result.actions[0].priority).toBe(6);
    expect(result.actions[0].to).toBe("/uscite/participating-1");
  });

  it("riusa una notifica feedback non letta come azione operativa", () => {
    const notification: AppNotification = {
      id: "notification-1",
      type: "feedback_reminder",
      tripId: "trip-1",
      tripTitle: "Uscita",
      actorName: null,
      readAt: null,
      createdAt: "2026-08-27T09:00:00.000Z",
    };
    const result = buildHomeDashboard({
      organized: [],
      participating: [],
      feedbackTripIds: new Set(),
      requestSummaries: new Map(),
      notifications: [notification],
      now: NOW,
    });

    expect(result.actions[0]).toMatchObject({
      title: "Lascia il feedback",
      to: "/uscite/trip-1/feedback",
    });
  });
});

describe("homeDiscoveryPreview", () => {
  it("mostra solo uscite disponibili senza algoritmo di compatibilità", () => {
    const base = {
      id: "trip-1",
      organizerUserId: "organizer-2",
      organizerName: "Ada",
      title: "Uscita",
      techniqueId: 1,
      techniqueName: "Spinning",
      waterType: "sea",
      startsAt: "2026-08-30T08:00:00.000Z",
      endsAt: "2026-08-30T12:00:00.000Z",
      provinceCode: "RM",
      provinceName: "Roma",
      publicZone: "Ostia",
      maxParticipants: 4,
      availablePlaces: 2,
      recommendedLevel: "any",
      description: "Descrizione",
      tripType: "free",
      participationStatus: null,
    } satisfies FishingTripDiscovery;
    const result = homeDiscoveryPreview([
      base,
      { ...base, id: "own", organizerUserId: "user-1" },
      { ...base, id: "full", availablePlaces: 0 },
      { ...base, id: "requested", participationStatus: "requested" },
    ], "user-1");

    expect(result.map((trip) => trip.id)).toEqual(["trip-1"]);
  });
});
