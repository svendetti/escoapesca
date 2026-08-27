const EVENT_COPY = {
  participation_requested: {
    subject: (title) => `Nuova richiesta per ${title}`,
    message: (title, actor) => `${actor} ha chiesto di partecipare a “${title}”.`,
  },
  participation_cancelled: {
    subject: (title) => `Richiesta annullata per ${title}`,
    message: (title, actor) => `${actor} ha annullato la richiesta per “${title}”.`,
  },
  participation_accepted: {
    subject: (title) => `Richiesta accettata per ${title}`,
    message: (title) => `La tua richiesta per “${title}” è stata accettata.`,
  },
  participation_rejected: {
    subject: (title) => `Aggiornamento richiesta per ${title}`,
    message: (title) => `La tua richiesta per “${title}” non è stata accettata.`,
  },
  trip_confirmed: {
    subject: (title) => `Uscita confermata: ${title}`,
    message: (title) => `L’uscita “${title}” è confermata.`,
  },
  trip_cancelled: {
    subject: (title) => `Uscita annullata: ${title}`,
    message: (title) => `L’uscita “${title}” è stata annullata.`,
  },
  trip_updated: {
    subject: (title) => `Uscita aggiornata: ${title}`,
    message: (title) => `Sono cambiate informazioni importanti per “${title}”.`,
  },
  trip_private_details_updated: {
    subject: (title) => `Dettagli incontro aggiornati: ${title}`,
    message: (title) => `I dettagli dell’incontro per “${title}” sono disponibili su EscoAPesca.`,
  },
};

function cleanInline(value, fallback) {
  const cleaned = String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return cleaned || fallback;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildEmailContent(delivery, appBaseUrl = "https://app.escoapesca.it") {
  const copy = EVENT_COPY[delivery.event_type];
  if (!copy) throw new Error(`Evento email non supportato: ${delivery.event_type}`);
  if (!delivery.trip_id) throw new Error("Uscita mancante per il delivery email");

  const title = cleanInline(delivery.trip_title, "la tua uscita");
  const actor = cleanInline(delivery.actor_name, "Un pescatore");
  const baseUrl = new URL(appBaseUrl);
  const ctaUrl = new URL(`/uscite/${encodeURIComponent(delivery.trip_id)}`, baseUrl).toString();
  const subject = cleanInline(copy.subject(title), "Aggiornamento EscoAPesca").slice(0, 160);
  const message = copy.message(title, actor);

  return {
    subject,
    text: `${message}\n\nVedi l’uscita: ${ctaUrl}`,
    html: [
      '<div style="font-family:Arial,sans-serif;color:#0b2333;line-height:1.5">',
      `<p>${escapeHtml(message)}</p>`,
      `<p><a href="${escapeHtml(ctaUrl)}" style="background:#075668;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Vedi l’uscita</a></p>`,
      '<p style="font-size:12px;color:#526671">EscoAPesca · Beta Lazio</p>',
      "</div>",
    ].join(""),
    ctaUrl,
  };
}

export const SUPPORTED_EMAIL_EVENTS = Object.freeze(Object.keys(EVENT_COPY));
