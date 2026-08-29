import type { FishingTrip } from "../types/domain";

export function shouldShowTripShare(
  trip: Pick<FishingTrip, "endsAt" | "status">,
  now = Date.now(),
): boolean {
  return new Date(trip.endsAt).getTime() > now
    && !["completed", "cancelled"].includes(trip.status);
}

export function shouldShowFeedbackPrompt(
  trip: Pick<FishingTrip, "endsAt" | "status">,
  hasSubmittedFeedback: boolean,
  now = Date.now(),
): boolean {
  return !hasSubmittedFeedback
    && new Date(trip.endsAt).getTime() <= now
    && ["confirmed", "completed"].includes(trip.status);
}
