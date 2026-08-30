import { describe, expect, it } from "vitest";
import { automaticTripTitle, formatTripSchedule, zoneFieldLabel } from "./tripExperience";

describe("trip experience", () => {
  it("compone un titolo breve dai dettagli già scelti", () => {
    expect(automaticTripTitle("Spinning", "Ostia")).toBe("Spinning — Ostia");
    expect(automaticTripTitle("", "Lago di Bracciano")).toBe("Uscita a Lago di Bracciano");
  });

  it("spiega una fine flessibile senza inventare un orario pubblico", () => {
    expect(formatTripSchedule(
      "2030-06-15T07:00:00+02:00",
      "2030-06-15T23:59:59+02:00",
      "date",
    )).toContain("senza orario di fine");
  });

  it("mostra entrambe le date per un’uscita su più giorni", () => {
    const label = formatTripSchedule(
      "2030-06-15T07:00:00+02:00",
      "2030-06-17T12:00:00+02:00",
      "datetime",
    );
    expect(label).toContain("→");
    expect(label).toContain("17 giu");
  });

  it("usa una label coerente anche per laghi e fiumi", () => {
    expect(zoneFieldLabel("sea")).toBe("Zona costiera");
    expect(zoneFieldLabel("freshwater")).toBe("Lago, fiume o zona");
  });
});
