import type { TripType } from "../types/domain";

const PUBLIC_APP_ORIGIN = "https://app.escoapesca.it";

export type TripShareData = {
  tripId: string;
  title: string;
  techniqueName: string;
  publicZone: string;
  startsAt: string;
  availablePlaces: number | null;
  tripType: TripType;
};

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Rome",
});

const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export function publicTripUrl(tripId: string) {
  return `${PUBLIC_APP_ORIGIN}/u/${encodeURIComponent(tripId)}`;
}

export function tripWhatsAppMessage(data: TripShareData) {
  const startsAt = new Date(data.startsAt);
  const places = data.availablePlaces === null
    ? ""
    : ` · ${data.availablePlaces} ${data.availablePlaces === 1 ? "posto disponibile" : "posti disponibili"}`;
  const privacy = data.tripType === "protected" ? "Spot protetto." : "Uscita libera.";

  return `${data.title} — ${data.techniqueName}, ${dateFormatter.format(startsAt)} alle ${timeFormatter.format(startsAt)} a ${data.publicZone}${places}. ${privacy} Dettagli su EscoAPesca: ${publicTripUrl(data.tripId)}`;
}

export function whatsappShareUrl(data: TripShareData) {
  return `https://wa.me/?text=${encodeURIComponent(tripWhatsAppMessage(data))}`;
}

function fallbackCopy(text: string) {
  if (!globalThis.document?.body) return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

export async function copyPublicTripLink(
  tripId: string,
  clipboard: Pick<Clipboard, "writeText"> | undefined = globalThis.navigator?.clipboard,
) {
  const url = publicTripUrl(tripId);
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(url);
      return true;
    } catch {
      return fallbackCopy(url);
    }
  }
  return fallbackCopy(url);
}
