import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));
import { validateTripFeedback, type TripFeedbackValues } from "./feedback";

const validValues: TripFeedbackValues = {
  tripHappened: true,
  metNewFisher: true,
  wouldRepeat: true,
  rating: 5,
  comment: "Bella uscita",
};

describe("validateTripFeedback", () => {
  it("accetta un feedback completo", () => {
    expect(validateTripFeedback(validValues)).toBeNull();
  });

  it("richiede una risposta esplicita sull’uscita", () => {
    expect(validateTripFeedback({ ...validValues, tripHappened: null })).toMatch(/realmente svolta/i);
  });

  it("richiede le risposte di validazione quando l’uscita si è svolta", () => {
    expect(validateTripFeedback({ ...validValues, metNewFisher: null })).toMatch(/conosciuto/i);
    expect(validateTripFeedback({ ...validValues, wouldRepeat: null })).toMatch(/nuovamente/i);
  });

  it("non richiede le domande sul gruppo se l’uscita non si è svolta", () => {
    expect(validateTripFeedback({
      ...validValues,
      tripHappened: false,
      metNewFisher: null,
      wouldRepeat: null,
    })).toBeNull();
  });

  it("valida stelle e lunghezza del commento", () => {
    expect(validateTripFeedback({ ...validValues, rating: 0 })).toMatch(/1 a 5/i);
    expect(validateTripFeedback({ ...validValues, comment: "x".repeat(1001) })).toMatch(/1000/i);
  });
});
