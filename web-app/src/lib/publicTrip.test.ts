import { describe, expect, it } from "vitest";
import {
  canRequestPublicTrip,
  publicTripPhase,
  publicTripShareDescription,
  type PublicFishingTrip,
} from "./publicTrip";

const futureTrip: PublicFishingTrip = {
  id: "4f0c90ab-1a44-4d98-9f15-cc8cbcc8ba25",
  publicCode: "EP-1234567890",
  title: "Spinning domenica mattina",
  techniqueName: "Spinning",
  waterType: "sea",
  startsAt: "2030-01-02T08:00:00Z",
  endsAt: "2030-01-02T12:00:00Z",
  endPrecision: "datetime",
  provinceCode: "RM",
  provinceName: "Roma",
  publicZone: "Fiumicino",
  publicMeetingPoint: null,
  maxParticipants: 3,
  availablePlaces: 2,
  recommendedLevel: "any",
  description: "Uscita in compagnia.",
  tripType: "protected",
  status: "open",
};

describe("public trip lifecycle", () => {
  it("consente richieste soltanto per uscite aperte, future e con posti", () => {
    expect(canRequestPublicTrip(futureTrip, Date.parse("2030-01-01T00:00:00Z"))).toBe(true);
    expect(canRequestPublicTrip(
      { ...futureTrip, availablePlaces: 0 },
      Date.parse("2030-01-01T00:00:00Z"),
    )).toBe(false);
    expect(canRequestPublicTrip(
      { ...futureTrip, status: "confirmed", availablePlaces: null },
      Date.parse("2030-01-01T00:00:00Z"),
    )).toBe(false);
  });

  it("mantiene leggibili gli stati terminali in sola lettura", () => {
    expect(publicTripPhase({ ...futureTrip, status: "cancelled" })).toBe("cancelled");
    expect(publicTripPhase({ ...futureTrip, status: "confirmed" })).toBe("confirmed");
    expect(publicTripPhase({ ...futureTrip, status: "completed" })).toBe("completed");
    expect(publicTripPhase(futureTrip, Date.parse("2030-01-03T00:00:00Z"))).toBe("completed");
  });

  it("genera una descrizione pubblica senza dettagli privati", () => {
    expect(publicTripShareDescription(futureTrip)).toBe(
      "Spinning domenica mattina · EP-1234567890 · Spot protetto · Fiumicino, Roma. Scopri i dettagli su EscoAPesca.",
    );
  });
});
