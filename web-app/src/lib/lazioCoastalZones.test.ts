import { describe, expect, it } from "vitest";
import { LAZIO_COASTAL_ZONES, coastalZonesForProvince } from "./lazioCoastalZones";

const OFFICIAL_COASTAL_MUNICIPALITIES = [
  "Montalto di Castro", "Tarquinia", "Civitavecchia", "Santa Marinella", "Cerveteri", "Ladispoli",
  "Fiumicino", "Roma", "Pomezia", "Ardea", "Anzio", "Nettuno", "Latina", "Sabaudia",
  "San Felice Circeo", "Terracina", "Fondi", "Sperlonga", "Itri", "Gaeta", "Formia", "Minturno",
  "Ponza", "Ventotene",
];

describe("Lazio coastal zones", () => {
  it("covers every coastal and island municipality in the regional list", () => {
    const municipalities = [...new Set(LAZIO_COASTAL_ZONES.map((zone) => zone.municipality))].sort();
    expect(municipalities).toEqual([...OFFICIAL_COASTAL_MUNICIPALITIES].sort());
  });

  it("uses unique values accepted by the trip form", () => {
    const values = LAZIO_COASTAL_ZONES.map((zone) => zone.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((value) => value.length >= 2 && value.length <= 160)).toBe(true);
  });

  it("filters zones by province", () => {
    expect(coastalZonesForProvince("VT").every((zone) => zone.provinceCode === "VT")).toBe(true);
    expect(coastalZonesForProvince("FR")).toEqual([]);
  });
});
