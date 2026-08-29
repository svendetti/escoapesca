import { describe, expect, it } from "vitest";
import { shouldShowFeedbackPrompt, shouldShowTripShare } from "./tripPresentation";

const future = "2026-09-01T12:00:00.000Z";
const past = "2026-08-28T12:00:00.000Z";
const now = new Date("2026-08-29T12:00:00.000Z").getTime();

describe("trip presentation", () => {
  it("mantiene la condivisione soltanto per uscite future e utilizzabili", () => {
    expect(shouldShowTripShare({ endsAt: future, status: "open" }, now)).toBe(true);
    expect(shouldShowTripShare({ endsAt: future, status: "confirmed" }, now)).toBe(true);
    expect(shouldShowTripShare({ endsAt: past, status: "open" }, now)).toBe(false);
    expect(shouldShowTripShare({ endsAt: future, status: "cancelled" }, now)).toBe(false);
    expect(shouldShowTripShare({ endsAt: past, status: "completed" }, now)).toBe(false);
  });

  it("nasconde la richiesta feedback quando l'utente ha già risposto", () => {
    const trip = { endsAt: past, status: "completed" as const };
    expect(shouldShowFeedbackPrompt(trip, false, now)).toBe(true);
    expect(shouldShowFeedbackPrompt(trip, true, now)).toBe(false);
  });

  it("non richiede feedback per uscite future, aperte o annullate", () => {
    expect(shouldShowFeedbackPrompt({ endsAt: future, status: "confirmed" }, false, now)).toBe(false);
    expect(shouldShowFeedbackPrompt({ endsAt: past, status: "open" }, false, now)).toBe(false);
    expect(shouldShowFeedbackPrompt({ endsAt: past, status: "cancelled" }, false, now)).toBe(false);
  });
});
