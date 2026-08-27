import { requireSupabase } from "./supabase";
import type { AppNotification, AppNotificationType } from "../types/domain";

type NotificationRow = {
  id: string;
  notification_type: string;
  trip_id: string | null;
  payload: unknown;
  read_at: string | null;
  created_at: string;
};

function payloadText(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.notification_type as AppNotificationType,
    tripId: row.trip_id,
    tripTitle: payloadText(row.payload, "trip_title"),
    actorName: payloadText(row.payload, "actor_name"),
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function loadNotifications(): Promise<AppNotification[]> {
  const { data, error } = await requireSupabase()
    .from("notifications")
    .select("id, notification_type, trip_id, payload, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map(mapNotification);
}

export async function loadUnreadNotificationCount() {
  const { count, error } = await requireSupabase()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

function announceNotificationUpdate() {
  window.dispatchEvent(new Event("escoapesca:notifications-updated"));
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await requireSupabase()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);

  if (error) throw error;
  announceNotificationUpdate();
}

export async function markAllNotificationsRead() {
  const readAt = new Date().toISOString();
  const { error } = await requireSupabase()
    .from("notifications")
    .update({ read_at: readAt })
    .is("read_at", null);

  if (error) throw error;
  announceNotificationUpdate();
  return readAt;
}

export function notificationCopy(notification: AppNotification) {
  const trip = notification.tripTitle ? ` “${notification.tripTitle}”` : "";
  const actor = notification.actorName ?? "Un pescatore";

  switch (notification.type) {
    case "participation_requested":
      return { title: "Nuova richiesta", message: `${actor} vuole partecipare a${trip}.`, target: notification.tripId ? `/uscite/${notification.tripId}` : null };
    case "participation_cancelled":
      return { title: "Richiesta annullata", message: `${actor} ha annullato la richiesta per${trip}.`, target: notification.tripId ? `/uscite/${notification.tripId}` : null };
    case "participation_accepted":
      return { title: "Richiesta accettata", message: `La tua richiesta per${trip} è stata accettata.`, target: "/trova-uscita" };
    case "participation_rejected":
      return { title: "Richiesta non accettata", message: `La tua richiesta per${trip} non è stata accettata.`, target: "/trova-uscita" };
    case "trip_confirmed":
      return { title: "Uscita confermata", message: `L’uscita${trip} è confermata. Ora puoi vedere i dettagli privati.`, target: notification.tripId ? `/uscite/${notification.tripId}` : null };
    case "trip_updated":
      return { title: "Uscita modificata", message: `L’organizzatore ha aggiornato${trip}. Controlla data e informazioni pubbliche.`, target: "/trova-uscita" };
    case "trip_cancelled":
      return { title: "Uscita annullata", message: `L’organizzatore ha annullato${trip}.`, target: null };
    case "trip_private_details_updated":
      return { title: "Dettagli incontro aggiornati", message: `Sono cambiati i dettagli privati di${trip}.`, target: notification.tripId ? `/uscite/${notification.tripId}` : null };
    case "feedback_requested":
      return { title: "Com’è andata l’uscita?", message: "Bastano pochi secondi per lasciare il tuo feedback.", target: notification.tripId ? `/uscite/${notification.tripId}/feedback` : null };
    case "feedback_reminder":
      return { title: "Promemoria feedback", message: "Non hai ancora raccontato com’è andata: bastano pochi secondi.", target: notification.tripId ? `/uscite/${notification.tripId}/feedback` : null };
    default:
      return { title: "Aggiornamento uscita", message: `Ci sono novità per${trip}.`, target: null };
  }
}
