import type { TripEndPrecision, TripType } from "../types/domain";
import { formatTripSchedule } from "./tripExperience";

const PUBLIC_APP_ORIGIN = "https://app.escoapesca.it";

export type TripShareData = {
  tripId: string;
  publicCode: string;
  title: string;
  techniqueName: string;
  publicZone: string;
  startsAt: string;
  endsAt: string;
  endPrecision: TripEndPrecision;
  availablePlaces: number | null;
  tripType: TripType;
};

export function publicTripUrl(tripId: string) {
  return `${PUBLIC_APP_ORIGIN}/u/${encodeURIComponent(tripId)}`;
}

export function tripWhatsAppMessage(data: TripShareData) {
  const places = data.availablePlaces === null
    ? ""
    : ` · ${data.availablePlaces} ${data.availablePlaces === 1 ? "posto disponibile" : "posti disponibili"}`;
  const privacy = data.tripType === "protected" ? "Spot protetto." : "Uscita libera.";
  const schedule = formatTripSchedule(data.startsAt, data.endsAt, data.endPrecision);

  return `${data.title} · ${data.publicCode}\n${data.techniqueName} · ${schedule}\n${data.publicZone}${places}\n${privacy}\nDettagli su EscoAPesca: ${publicTripUrl(data.tripId)}`;
}

export function whatsappShareUrl(data: TripShareData) {
  return `https://wa.me/?text=${encodeURIComponent(tripWhatsAppMessage(data))}`;
}

export type NativeShareResult = "shared" | "cancelled" | "unsupported" | "failed";

type NativeShare = (data: ShareData) => Promise<void>;

export async function shareTripNatively(
  data: TripShareData,
  share: NativeShare | undefined = globalThis.navigator?.share?.bind(globalThis.navigator),
): Promise<NativeShareResult> {
  if (!share) return "unsupported";

  try {
    const url = publicTripUrl(data.tripId);
    await share({
      title: `${data.title} · ${data.publicCode}`,
      text: tripWhatsAppMessage(data).replace(`\nDettagli su EscoAPesca: ${url}`, ""),
      url,
    });
    return "shared";
  } catch (caught) {
    return caught instanceof DOMException && caught.name === "AbortError"
      ? "cancelled"
      : "failed";
  }
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