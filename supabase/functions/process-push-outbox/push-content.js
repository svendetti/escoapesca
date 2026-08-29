const EVENT_COPY = {
  participation_requested: (trip, actor) => ({
    title: "Nuova richiesta",
    body: `${actor} vuole partecipare a “${trip}”.`,
  }),
  participation_cancelled: (trip, actor) => ({
    title: "Richiesta annullata",
    body: `${actor} ha annullato la richiesta per “${trip}”.`,
  }),
  participation_accepted: (trip) => ({
    title: "Richiesta accettata",
    body: `La tua richiesta per “${trip}” è stata accettata.`,
  }),
  participation_rejected: (trip) => ({
    title: "Richiesta non accettata",
    body: `La tua richiesta per “${trip}” non è stata accettata.`,
  }),
  trip_invitation_sent: (trip, actor) => ({
    title: "Invito a un’uscita",
    body: `${actor} ti ha invitato a “${trip}”.`,
  }),
  trip_confirmed: (trip) => ({ title: "Uscita confermata", body: `“${trip}” è confermata.` }),
  trip_updated: (trip) => ({ title: "Uscita modificata", body: `Controlla gli aggiornamenti di “${trip}”.` }),
  trip_cancelled: (trip) => ({ title: "Uscita annullata", body: `“${trip}” è stata annullata.` }),
  trip_hidden_by_admin: (trip) => ({
    title: "Uscita oscurata",
    body: `“${trip}” non è più visibile nelle pagine pubbliche.`,
  }),
  trip_restored_by_admin: (trip) => ({
    title: "Uscita ripristinata",
    body: `“${trip}” è nuovamente visibile.`,
  }),
  trip_private_details_updated: (trip) => ({
    title: "Dettagli incontro aggiornati",
    body: `Sono cambiati i dettagli privati di “${trip}”.`,
  }),
  feedback_requested: () => ({
    title: "Com’è andata l’uscita?",
    body: "Bastano pochi secondi per lasciare il tuo feedback.",
  }),
  feedback_reminder: () => ({
    title: "Promemoria feedback",
    body: "Non hai ancora raccontato com’è andata.",
  }),
  push_test: () => ({
    title: "Notifiche EscoAPesca attive",
    body: "Perfetto: il telefono può ricevere gli avvisi anche quando l’app è chiusa.",
  }),
};

function cleanInline(value, fallback) {
  const cleaned = String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return cleaned || fallback;
}

export function buildPushContent(delivery) {
  const builder = EVENT_COPY[delivery.notification_type];
  if (!builder) throw new Error(`Evento push non supportato: ${delivery.notification_type}`);
  const trip = cleanInline(delivery.trip_title, "la tua uscita").slice(0, 120);
  const actor = cleanInline(delivery.actor_name, "Un pescatore").slice(0, 80);
  const copy = builder(trip, actor);
  const feedback = delivery.notification_type === "feedback_requested"
    || delivery.notification_type === "feedback_reminder";
  const url = delivery.trip_id
    ? `/uscite/${encodeURIComponent(delivery.trip_id)}${feedback ? "/feedback" : ""}`
    : "/notifiche";

  return {
    title: cleanInline(copy.title, "EscoAPesca").slice(0, 80),
    body: cleanInline(copy.body, "Hai un nuovo aggiornamento.").slice(0, 220),
    url,
    tag: `escoapesca-${delivery.delivery_id}`,
  };
}

export const SUPPORTED_PUSH_EVENTS = Object.freeze(Object.keys(EVENT_COPY));
