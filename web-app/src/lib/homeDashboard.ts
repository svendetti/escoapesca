import { canLeaveTripFeedback } from "./myTrips";
import type { FishingTripParticipation } from "./myTrips";
import type {
  AppNotification,
  FishingTrip,
  FishingTripDiscovery,
  TripEndPrecision,
  TripParticipationStatus,
  TripStatus,
} from "../types/domain";
import type { TripParticipationRequestSummary } from "./trips";

export type HomeTrip = {
  id: string;
  publicCode: string;
  role: "organizer" | "participant";
  title: string;
  startsAt: string;
  endsAt: string;
  endPrecision: TripEndPrecision;
  provinceCode: string;
  publicZone: string;
  status: TripStatus;
  participationStatus: TripParticipationStatus | null;
};

export type HomeAction = {
  key: string;
  priority: number;
  tripId: string | null;
  title: string;
  description: string;
  to: string;
};

export type HomeDashboard = {
  actions: HomeAction[];
  nextTrip: HomeTrip | null;
};

type BuildHomeDashboardInput = {
  organized: FishingTrip[];
  participating: FishingTripParticipation[];
  feedbackTripIds: Set<string>;
  requestSummaries: Map<string, TripParticipationRequestSummary>;
  notifications: AppNotification[];
  now?: number;
};

function organizedTrip(trip: FishingTrip): HomeTrip {
  return {
    id: trip.id,
    publicCode: trip.publicCode,
    role: "organizer",
    title: trip.title,
    startsAt: trip.startsAt,
    endsAt: trip.endsAt,
    endPrecision: trip.endPrecision,
    provinceCode: trip.provinceCode,
    publicZone: trip.publicZone,
    status: trip.status,
    participationStatus: null,
  };
}

function participatingTrip(trip: FishingTripParticipation): HomeTrip {
  return {
    id: trip.id,
    publicCode: trip.publicCode,
    role: "participant",
    title: trip.title,
    startsAt: trip.startsAt,
    endsAt: trip.endsAt,
    endPrecision: trip.endPrecision,
    provinceCode: trip.provinceCode,
    publicZone: trip.publicZone,
    status: trip.status,
    participationStatus: trip.participationStatus,
  };
}

function futureTrip(trip: HomeTrip, now: number) {
  if (new Date(trip.endsAt).getTime() <= now) return false;
  if (!["open", "confirmed"].includes(trip.status)) return false;
  return trip.role === "organizer"
    || ["accepted", "confirmed"].includes(trip.participationStatus ?? "");
}

function tripDestination(trip: HomeTrip) {
  if (trip.role === "organizer") return `/uscite/${trip.id}`;
  if (
    (trip.status === "confirmed" && trip.participationStatus === "confirmed")
    || (trip.status === "open" && trip.participationStatus === "accepted")
  ) {
    return `/uscite/${trip.id}`;
  }
  return "/trova-uscita";
}

function notificationAction(notification: AppNotification): HomeAction | null {
  if (notification.readAt) return null;
  const tripPath = notification.tripId ? `/uscite/${notification.tripId}` : "/notifiche";
  const feedbackPath = notification.tripId ? `${tripPath}/feedback` : "/notifiche";

  switch (notification.type) {
    case "feedback_requested":
    case "feedback_reminder":
      return { key: `notification-${notification.id}`, priority: 1, tripId: notification.tripId, title: "Lascia il feedback", description: "Com’è andata l’uscita? Bastano pochi secondi.", to: feedbackPath };
    case "participation_requested":
      return { key: `notification-${notification.id}`, priority: 2, tripId: notification.tripId, title: "Richiesta da valutare", description: "Un pescatore aspetta una tua decisione.", to: tripPath };
    case "trip_confirmed":
      return { key: `notification-${notification.id}`, priority: 4, tripId: notification.tripId, title: "L’uscita è confermata", description: "Controlla orario e informazioni dell’incontro.", to: tripPath };
    case "trip_private_details_updated":
      return { key: `notification-${notification.id}`, priority: 5, tripId: notification.tripId, title: "Dettagli dell’incontro disponibili", description: "Apri l’uscita per controllare il punto d’incontro.", to: tripPath };
    case "participation_accepted":
      return { key: `notification-${notification.id}`, priority: 6, tripId: notification.tripId, title: "La tua richiesta è stata accettata", description: "Attendi la conferma definitiva dell’organizzatore.", to: tripPath };
    default:
      return null;
  }
}

export function buildHomeDashboard({
  organized,
  participating,
  feedbackTripIds,
  requestSummaries,
  notifications,
  now = Date.now(),
}: BuildHomeDashboardInput): HomeDashboard {
  const trips = [
    ...organized.map(organizedTrip),
    ...participating.map(participatingTrip),
  ];
  const actions: HomeAction[] = [];

  for (const trip of trips) {
    if (canLeaveTripFeedback(
      trip.role,
      trip.startsAt,
      trip.endsAt,
      trip.status,
      trip.participationStatus,
      feedbackTripIds.has(trip.id),
      now,
    )) {
      actions.push({
        key: `feedback-${trip.role}-${trip.id}`,
        priority: 1,
        tripId: trip.id,
        title: "Lascia il feedback",
        description: `Raccontaci com’è andata “${trip.title}”.`,
        to: `/uscite/${trip.id}/feedback`,
      });
    }
  }

  for (const trip of organized) {
    const summary = requestSummaries.get(trip.id);
    if (!summary || new Date(trip.endsAt).getTime() <= now || trip.status !== "open") continue;

    if (summary.requested > 0) {
      actions.push({
        key: `requests-${trip.id}`,
        priority: 2,
        tripId: trip.id,
        title: summary.requested === 1 ? "1 richiesta da valutare" : `${summary.requested} richieste da valutare`,
        description: `Decidi chi parteciperà a “${trip.title}”.`,
        to: `/uscite/${trip.id}`,
      });
    }
    if (summary.accepted > 0) {
      actions.push({
        key: `confirm-${trip.id}`,
        priority: 3,
        tripId: trip.id,
        title: "Conferma il gruppo",
        description: `Hai già accettato ${summary.accepted === 1 ? "un partecipante" : `${summary.accepted} partecipanti`} per “${trip.title}”.`,
        to: `/uscite/${trip.id}`,
      });
    }
  }

  const futureTrips = trips
    .filter((trip) => futureTrip(trip, now))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const nextTrip = futureTrips[0] ?? null;

  for (const trip of futureTrips) {
    const startsIn = new Date(trip.startsAt).getTime() - now;
    if (
      trip.status === "confirmed"
      && (trip.role === "organizer" || trip.participationStatus === "confirmed")
      && startsIn <= 72 * 60 * 60 * 1000
    ) {
      actions.push({
        key: `confirmed-${trip.role}-${trip.id}`,
        priority: 4,
        tripId: trip.id,
        title: "L’uscita è confermata",
        description: `“${trip.title}” è vicina: controlla orario e incontro.`,
        to: tripDestination(trip),
      });
    } else if (
      trip.role === "participant"
      && trip.status === "confirmed"
      && trip.participationStatus === "confirmed"
    ) {
      actions.push({
        key: `details-${trip.id}`,
        priority: 5,
        tripId: trip.id,
        title: "Sono disponibili i dettagli dell’incontro",
        description: `Controlla il punto condiviso per “${trip.title}”.`,
        to: tripDestination(trip),
      });
    } else if (
      trip.role === "participant"
      && trip.status === "open"
      && trip.participationStatus === "accepted"
    ) {
      actions.push({
        key: `accepted-${trip.id}`,
        priority: 6,
        tripId: trip.id,
        title: "La tua richiesta è stata accettata",
        description: `Attendi la conferma definitiva per “${trip.title}”.`,
        to: tripDestination(trip),
      });
    }
  }

  for (const notification of notifications) {
    const action = notificationAction(notification);
    if (action) actions.push(action);
  }

  const seen = new Set<string>();
  const deduplicated = actions
    .sort((a, b) => a.priority - b.priority)
    .filter((action) => {
      const identity = `${action.priority}:${action.tripId ?? action.key}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });

  if (deduplicated.length === 0 && nextTrip) {
    deduplicated.push({
      key: `next-${nextTrip.role}-${nextTrip.id}`,
      priority: 7,
      tripId: nextTrip.id,
      title: "La tua prossima uscita",
      description: `Controlla “${nextTrip.title}” e preparati per tempo.`,
      to: tripDestination(nextTrip),
    });
  }

  return { actions: deduplicated.slice(0, 4), nextTrip };
}

export function homeDiscoveryPreview(
  trips: FishingTripDiscovery[],
  currentUserId: string,
  limit = 3,
) {
  return trips
    .filter((trip) => (
      trip.organizerUserId !== currentUserId
      && trip.availablePlaces > 0
      && [null, "cancelled"].includes(trip.participationStatus)
    ))
    .slice(0, limit);
}
