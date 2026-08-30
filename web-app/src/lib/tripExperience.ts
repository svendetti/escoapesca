import type { TripEndPrecision, TripWaterType } from "../types/domain";

export function automaticTripTitle(techniqueName: string, publicZone: string) {
  const technique = techniqueName.trim();
  const zone = publicZone.trim();
  if (technique && zone) return `${technique} — ${zone}`;
  return technique || (zone ? `Uscita a ${zone}` : "Nuova uscita");
}

export function formatTripSchedule(
  startsAtValue: string,
  endsAtValue: string,
  endPrecision: TripEndPrecision,
) {
  const startsAt = new Date(startsAtValue);
  const endsAt = new Date(endsAtValue);
  const day = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" });
  const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  const key = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Rome" });
  const sameDay = key.format(startsAt) === key.format(endsAt);

  if (endPrecision === "date" && sameDay) {
    return `${day.format(startsAt)} · dalle ${time.format(startsAt)} · senza orario di fine`;
  }
  if (endPrecision === "date") {
    return `${day.format(startsAt)} ${time.format(startsAt)} → ${day.format(endsAt)} · senza orario preciso`;
  }
  if (sameDay) return `${day.format(startsAt)} · ${time.format(startsAt)}–${time.format(endsAt)}`;
  return `${day.format(startsAt)} ${time.format(startsAt)} → ${day.format(endsAt)} ${time.format(endsAt)}`;
}

export function zoneFieldLabel(waterType: TripWaterType | "") {
  if (waterType === "sea") return "Zona costiera";
  if (waterType === "freshwater") return "Lago, fiume o zona";
  return "Zona";
}
