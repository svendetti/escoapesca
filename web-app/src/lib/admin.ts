import { requireSupabase } from "./supabase";

export type AdminMetrics = {
  registeredUsers: number;
  completedProfiles: number;
  createdTrips: number;
  participationRequests: number;
  acceptedRequests: number;
  confirmedTrips: number;
  reportedTrips: number;
  realTrips: number;
  repeatParticipants: number;
  usersWithAcceptedParticipation: number;
  registeredToParticipationRatio: number | null;
  createdToRealTripRatio: number | null;
  activeUsers: number;
  disabledUsers: number;
  newUsers7Days: number;
  newUsers30Days: number;
  activeTrips: number;
  openTrips: number;
  confirmedStatusTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  overdueTrips: number;
  openTripsWithoutRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  availablePlaces: number;
  feedbackReceived: number;
  missingFeedback: number;
  averageRating: number | null;
  wouldRepeatRatio: number | null;
  profileCompletionRatio: number | null;
  requestAcceptanceRatio: number | null;
  confirmedToRealTripRatio: number | null;
  feedbackCompletionRatio: number | null;
  averageRequestsPerTrip: number | null;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  status: "active" | "disabled";
  isTest: boolean;
  provinceCode: string | null;
  municipalityName: string | null;
  profileCompletedAt: string | null;
  emailVerifiedAt: string | null;
  disabledAt: string | null;
  createdAt: string;
};

export type AdminTrip = {
  id: string;
  title: string;
  organizerUserId: string;
  organizerName: string;
  techniqueName: string;
  status: string;
  startsAt: string;
  endsAt: string;
  provinceCode: string;
  publicZone: string;
  tripType: string;
  maxParticipants: number;
  participantCount: number;
  pendingCount: number;
  acceptedCount: number;
  createdAt: string;
};

export type AdminParticipation = {
  id: string;
  tripId: string;
  tripTitle: string;
  userId: string;
  userName: string;
  status: string;
  requestedAt: string;
  updatedAt: string;
};

export type AdminFeedback = {
  id: string;
  tripId: string;
  tripTitle: string;
  authorUserId: string;
  authorName: string;
  tripHappened: boolean;
  metNewFisher: boolean;
  wouldRepeat: boolean;
  rating: number;
  comment: string | null;
  submittedAt: string;
};

export type AdminAction = {
  id: number;
  actionType: string;
  actorUserId: string;
  actorName: string;
  targetUserId: string | null;
  targetUserName: string | null;
  targetTripId: string | null;
  targetTripTitle: string | null;
  reason: string;
  createdAt: string;
};

export type AdminDashboard = {
  metrics: AdminMetrics;
  users: AdminUser[];
  trips: AdminTrip[];
  participations: AdminParticipation[];
  feedback: AdminFeedback[];
  actions: AdminAction[];
};

export const ADMIN_RESET_CONFIRMATION = "ELIMINA USCITE";
export const ADMIN_DELETE_USER_CONFIRMATION = "ELIMINA UTENTE";

export type AdminOperationalResetResult = {
  usersPreserved: number;
  tripsDeleted: number;
  participationsDeleted: number;
  privateDetailsDeleted: number;
  feedbackDeleted: number;
  notificationsDeleted: number;
  eventsDeleted: number;
  emailDeliveriesDeleted: number;
  adminActionsDeleted: number;
  operationalRowsDeleted: number;
};

export type AdminDeleteUserResult = {
  deletedUserId: string;
  deletedTrips: number;
};

type JsonRow = Record<string, unknown>;

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rows(value: unknown): JsonRow[] {
  return Array.isArray(value) ? value as JsonRow[] : [];
}

export function betaGoalProgress(realTrips: number, target = 5): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((realTrips / target) * 100)));
}

export function formatRatio(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function formatDecimal(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits);
}

export async function loadAdminDashboard(limit = 100): Promise<AdminDashboard> {
  const { data, error } = await requireSupabase().rpc("get_admin_dashboard", { p_limit: limit });
  if (error) throw error;
  const source = (data ?? {}) as JsonRow;
  const metric = (source.metrics ?? {}) as JsonRow;

  return {
    metrics: {
      registeredUsers: numberValue(metric.registered_users),
      completedProfiles: numberValue(metric.completed_profiles),
      createdTrips: numberValue(metric.created_trips),
      participationRequests: numberValue(metric.participation_requests),
      acceptedRequests: numberValue(metric.accepted_requests),
      confirmedTrips: numberValue(metric.confirmed_trips),
      reportedTrips: numberValue(metric.reported_trips),
      realTrips: numberValue(metric.real_trips),
      repeatParticipants: numberValue(metric.repeat_participants),
      usersWithAcceptedParticipation: numberValue(metric.users_with_accepted_participation),
      registeredToParticipationRatio: nullableNumber(metric.registered_to_participation_ratio),
      createdToRealTripRatio: nullableNumber(metric.created_to_real_trip_ratio),
      activeUsers: numberValue(metric.active_users),
      disabledUsers: numberValue(metric.disabled_users),
      newUsers7Days: numberValue(metric.new_users_7_days),
      newUsers30Days: numberValue(metric.new_users_30_days),
      activeTrips: numberValue(metric.active_trips),
      openTrips: numberValue(metric.open_trips),
      confirmedStatusTrips: numberValue(metric.confirmed_status_trips),
      completedTrips: numberValue(metric.completed_trips),
      cancelledTrips: numberValue(metric.cancelled_trips),
      overdueTrips: numberValue(metric.overdue_trips),
      openTripsWithoutRequests: numberValue(metric.open_trips_without_requests),
      pendingRequests: numberValue(metric.pending_requests),
      rejectedRequests: numberValue(metric.rejected_requests),
      cancelledRequests: numberValue(metric.cancelled_requests),
      availablePlaces: numberValue(metric.available_places),
      feedbackReceived: numberValue(metric.feedback_received),
      missingFeedback: numberValue(metric.missing_feedback),
      averageRating: nullableNumber(metric.average_rating),
      wouldRepeatRatio: nullableNumber(metric.would_repeat_ratio),
      profileCompletionRatio: nullableNumber(metric.profile_completion_ratio),
      requestAcceptanceRatio: nullableNumber(metric.request_acceptance_ratio),
      confirmedToRealTripRatio: nullableNumber(metric.confirmed_to_real_trip_ratio),
      feedbackCompletionRatio: nullableNumber(metric.feedback_completion_ratio),
      averageRequestsPerTrip: nullableNumber(metric.average_requests_per_trip),
    },
    users: rows(source.users).map((row) => ({
      id: String(row.id), email: String(row.email), displayName: String(row.display_name),
      status: row.status === "disabled" ? "disabled" : "active", isTest: Boolean(row.is_test),
      provinceCode: row.province_code ? String(row.province_code) : null,
      municipalityName: row.municipality_name ? String(row.municipality_name) : null,
      profileCompletedAt: row.profile_completed_at ? String(row.profile_completed_at) : null,
      emailVerifiedAt: row.email_verified_at ? String(row.email_verified_at) : null,
      disabledAt: row.disabled_at ? String(row.disabled_at) : null, createdAt: String(row.created_at),
    })),
    trips: rows(source.trips).map((row) => ({
      id: String(row.id), title: String(row.title), organizerUserId: String(row.organizer_user_id),
      organizerName: String(row.organizer_name), techniqueName: String(row.technique_name), status: String(row.status),
      startsAt: String(row.starts_at), endsAt: String(row.ends_at), provinceCode: String(row.province_code),
      publicZone: String(row.public_zone), tripType: String(row.trip_type), maxParticipants: numberValue(row.max_participants),
      participantCount: numberValue(row.participant_count), pendingCount: numberValue(row.pending_count),
      acceptedCount: numberValue(row.accepted_count), createdAt: String(row.created_at),
    })),
    participations: rows(source.participations).map((row) => ({
      id: String(row.id), tripId: String(row.trip_id), tripTitle: String(row.trip_title),
      userId: String(row.user_id), userName: String(row.user_name), status: String(row.status),
      requestedAt: String(row.requested_at), updatedAt: String(row.updated_at),
    })),
    feedback: rows(source.feedback).map((row) => ({
      id: String(row.id), tripId: String(row.trip_id), tripTitle: String(row.trip_title),
      authorUserId: String(row.author_user_id), authorName: String(row.author_name),
      tripHappened: Boolean(row.trip_happened), metNewFisher: Boolean(row.met_new_fisher),
      wouldRepeat: Boolean(row.would_repeat), rating: numberValue(row.rating),
      comment: row.comment ? String(row.comment) : null, submittedAt: String(row.submitted_at),
    })),
    actions: rows(source.actions).map((row) => ({
      id: numberValue(row.id), actionType: String(row.action_type), actorUserId: String(row.actor_user_id),
      actorName: String(row.actor_name), targetUserId: row.target_user_id ? String(row.target_user_id) : null,
      targetUserName: row.target_user_name ? String(row.target_user_name) : null,
      targetTripId: row.target_trip_id ? String(row.target_trip_id) : null,
      targetTripTitle: row.target_trip_title ? String(row.target_trip_title) : null,
      reason: String(row.reason), createdAt: String(row.created_at),
    })),
  };
}

export async function setAdminUserStatus(userId: string, status: "active" | "disabled", reason: string) {
  const { error } = await requireSupabase().rpc("admin_set_user_status", {
    p_user_id: userId,
    p_status: status,
    p_reason: reason.trim(),
  });
  if (error) throw error;
}

async function edgeFunctionError(error: unknown): Promise<Error> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as { message?: string };
      if (body.message) return new Error(body.message);
    } catch {
      // Mantiene il messaggio SDK quando il body non è JSON.
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

export async function deleteDisabledAdminUser(
  userId: string,
  reason: string,
  confirmation: string,
): Promise<AdminDeleteUserResult> {
  const { data, error } = await requireSupabase().functions.invoke("admin-delete-user", {
    body: {
      userId,
      reason: reason.trim(),
      confirmation: confirmation.trim().toUpperCase(),
    },
  });
  if (error) throw await edgeFunctionError(error);

  const result = (data ?? {}) as JsonRow;
  return {
    deletedUserId: String(result.deleted_user_id ?? userId),
    deletedTrips: numberValue(result.deleted_trip_count),
  };
}

export async function cancelTripAsAdmin(tripId: string, reason: string) {
  const { error } = await requireSupabase().rpc("admin_cancel_fishing_trip", {
    p_trip_id: tripId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
}

export async function resetAdminOperationalData(
  confirmation: string,
): Promise<AdminOperationalResetResult> {
  const { data, error } = await requireSupabase().rpc("admin_reset_operational_data", {
    p_confirmation: confirmation.trim(),
  });
  if (error) throw error;

  const result = (data ?? {}) as JsonRow;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("escoapesca:notifications-updated"));
  }
  return {
    usersPreserved: numberValue(result.users_preserved),
    tripsDeleted: numberValue(result.trips_deleted),
    participationsDeleted: numberValue(result.participations_deleted),
    privateDetailsDeleted: numberValue(result.private_details_deleted),
    feedbackDeleted: numberValue(result.feedback_deleted),
    notificationsDeleted: numberValue(result.notifications_deleted),
    eventsDeleted: numberValue(result.events_deleted),
    emailDeliveriesDeleted: numberValue(result.email_deliveries_deleted),
    adminActionsDeleted: numberValue(result.admin_actions_deleted),
    operationalRowsDeleted: numberValue(result.operational_rows_deleted),
  };
}
