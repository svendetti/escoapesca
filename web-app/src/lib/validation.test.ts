import { describe, expect, it } from "vitest";
import { hasErrors, validateProfile, validateRegistration } from "./validation";
import { EMPTY_PROFILE } from "../types/domain";

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
