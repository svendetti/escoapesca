import { describe, expect, it } from "vitest";
import {
  hasErrors,
  tripDateTimes,
  validateProfile,
  validateRegistration,
  validateTrip,
  validateTripPrivateDetails,
} from "./validation";
import { EMPTY_PROFILE, EMPTY_TRIP, EMPTY_TRIP_PRIVATE_DETAILS } from "../types/domain";

describe("validateRegistration", () => {
  it("richiede dati legali e anagrafici minimi", () => {
    const errors = validateRegistration({
      displayName: "A",
      email: "non-valida",
      password: "corta",
      provinceCode: "RM",
      municipalityName: "",
      ageBand: "",
      adultConfirmed: false,
      privacyAccepted: false,
      termsAccepted: false,
    });

    expect(errors.displayName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(errors.municipalityName).toBeDefined();
    expect(errors.ageBand).toBeDefined();
    expect(errors.adultConfirmed).toBeDefined();
    expect(errors.privacyAccepted).toBeDefined();
    expect(errors.termsAccepted).toBeDefined();
  });
});

describe("validateProfile", () => {
  it("considera incompleto un profilo senza preferenze di pesca", () => {
    const errors = validateProfile({
      ...EMPTY_PROFILE,
      displayName: "Mario",
      municipalityName: "Roma",
      ageBand: "35_44",
    });

    expect(errors.waterType).toBeDefined();
    expect(errors.skillLevel).toBeDefined();
    expect(errors.techniqueIds).toBeDefined();
    expect(errors.availabilitySlotIds).toBeDefined();
  });

  it("accetta un profilo minimo completo", () => {
    const errors = validateProfile({
      ...EMPTY_PROFILE,
      displayName: "Mario",
      municipalityName: "Roma",
      ageBand: "35_44",
      waterType: "both",
      skillLevel: "intermediate",
      techniqueIds: [1],
      availabilitySlotIds: [1],
    });

    expect(hasErrors(errors)).toBe(false);
  });
});

describe("validateTrip", () => {
  const validTrip = {
    ...EMPTY_TRIP,
    title: "Spinning al tramonto",
    techniqueId: 1,
    waterType: "sea" as const,
    date: "2030-06-15",
    publicZone: "Litorale di Ostia",
    description: "Uscita tranquilla per pescare insieme.",
  };

  it("accetta i dati minimi di una futura uscita protetta", () => {
    const errors = validateTrip(validTrip, new Date("2030-01-01T00:00:00Z"));
    expect(hasErrors(errors)).toBe(false);
  });

  it("interpreta un orario finale precedente come uscita notturna", () => {
    const times = tripDateTimes({ date: "2030-06-15", startTime: "21:00", endTime: "02:00" });
    expect(times?.endsAt.getDate()).not.toBe(times?.startsAt.getDate());
    expect(times && times.endsAt > times.startsAt).toBe(true);
  });

  it("rifiuta una data passata e i campi pubblici incompleti", () => {
    const errors = validateTrip(
      { ...validTrip, title: "No", publicZone: "", date: "2029-01-01" },
      new Date("2030-01-01T00:00:00Z"),
    );
    expect(errors.title).toBeDefined();
    expect(errors.publicZone).toBeDefined();
    expect(errors.date).toBeDefined();
  });
});

describe("validateTripPrivateDetails", () => {
  it("richiede un punto di incontro e coordinate complete", () => {
    const errors = validateTripPrivateDetails({
      ...EMPTY_TRIP_PRIVATE_DETAILS,
      exactLat: "41.90",
    });

    expect(errors.meetingPointText).toBeDefined();
    expect(errors.exactLat).toBeDefined();
    expect(errors.exactLon).toBeDefined();
  });

  it("accetta punto, coordinate e note validi", () => {
    const errors = validateTripPrivateDetails({
      meetingPointText: "Parcheggio davanti al porto",
      exactLat: "41.7502",
      exactLon: "12.2871",
      privateNotes: "Chiamami quando arrivi al cancello.",
    });

    expect(hasErrors(errors)).toBe(false);
  });
});
