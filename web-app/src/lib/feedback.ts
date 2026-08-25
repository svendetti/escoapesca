import { requireSupabase } from "./supabase";

export type TripFeedback = {
  id: string;
  tripId: string;
  tripHappened: boolean;
  metNewFisher: boolean;
  wouldRepeat: boolean;
  rating: number;
  comment: string | null;
  submittedAt: string;
};

export type TripFeedbackValues = {
  tripHappened: boolean | null;
  metNewFisher: boolean | null;
  wouldRepeat: boolean | null;
  rating: number;
  comment: string;
};

type TripFeedbackRow = {
  feedback_id: string;
  trip_id: string;
  trip_happened: boolean;
  met_new_fisher: boolean;
  would_repeat: boolean;
  rating: number;
  comment: string | null;
  submitted_at: string;
};

function mapTripFeedback(row: TripFeedbackRow): TripFeedback {
  return {
    id: row.feedback_id,
    tripId: row.trip_id,
    tripHappened: row.trip_happened,
    metNewFisher: row.met_new_fisher,
    wouldRepeat: row.would_repeat,
    rating: row.rating,
    comment: row.comment,
    submittedAt: row.submitted_at,
  };
}

export function validateTripFeedback(values: TripFeedbackValues): string | null {
  if (values.tripHappened === null) return "Indica se l’uscita si è realmente svolta.";

  if (values.tripHappened) {
    if (values.metNewFisher === null) {
      return "Indica se hai pescato con qualcuno conosciuto tramite EscoAPesca.";
    }
    if (values.wouldRepeat === null) {
      return "Indica se andresti nuovamente a pesca con questa persona o gruppo.";
    }
  }

  if (!Number.isInteger(values.rating) || values.rating < 1 || values.rating > 5) {
    return "Scegli una valutazione da 1 a 5 stelle.";
  }

  if (values.comment.trim().length > 1000) {
    return "Il commento non può superare 1000 caratteri.";
  }

  return null;
}

export async function loadMyTripFeedback(): Promise<TripFeedback[]> {
  const { data, error } = await requireSupabase().rpc("list_my_trip_feedback");
  if (error) throw error;
  return ((data ?? []) as TripFeedbackRow[]).map(mapTripFeedback);
}

export async function submitTripFeedback(
  tripId: string,
  values: TripFeedbackValues,
): Promise<TripFeedback> {
  const validationError = validateTripFeedback(values);
  if (validationError) throw new Error(validationError);

  const tripHappened = values.tripHappened === true;
  const { data, error } = await requireSupabase().rpc("submit_trip_feedback", {
    p_trip_id: tripId,
    p_trip_happened: tripHappened,
    p_met_new_fisher: tripHappened && values.metNewFisher === true,
    p_would_repeat: tripHappened && values.wouldRepeat === true,
    p_rating: values.rating,
    p_comment: values.comment.trim() || null,
  });

  if (error) throw error;
  const row = ((data ?? []) as TripFeedbackRow[])[0];
  if (!row) throw new Error("Feedback non registrato.");
  return mapTripFeedback(row);
}
