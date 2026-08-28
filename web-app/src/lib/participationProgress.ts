import type { TripParticipationStatus, TripStatus } from "../types/domain";

export type ParticipationProgressNotice = {
  kind: "info" | "success";
  message: string;
};

export function participationProgressNotice(
  status: TripParticipationStatus | null,
): ParticipationProgressNotice | null {
  switch (status) {
    case "requested":
      return {
        kind: "info",
        message: "Richiesta inviata. L’organizzatore deve ancora valutarla.",
      };
    case "accepted":
      return {
        kind: "info",
        message:
          "Richiesta accettata — in attesa di conferma. L’organizzatore deve ancora confermare definitivamente l’uscita. Riceverai un avviso quando potrai vedere i dettagli dell’incontro.",
      };
    case "confirmed":
    case "completed":
      return {
        kind: "success",
        message:
          "La tua partecipazione è confermata. Puoi consultare i dettagli riservati dell’incontro.",
      };
    case "rejected":
      return {
        kind: "info",
        message: "La tua richiesta di partecipazione non è stata accettata.",
      };
    case "cancelled":
      return {
        kind: "info",
        message: "La tua partecipazione a questa uscita è stata annullata.",
      };
    case "no_show":
      return {
        kind: "info",
        message: "Per questa uscita risulti assente.",
      };
    default:
      return null;
  }
}

export function privateDetailsUnavailableMessage(
  participationStatus: TripParticipationStatus | null,
  tripStatus: TripStatus,
): string {
  if (tripStatus === "open") {
    if (participationStatus === "accepted") {
      return "I dettagli riservati diventeranno visibili quando l’organizzatore confermerà definitivamente l’uscita.";
    }

    if (participationStatus === "requested") {
      return "I dettagli riservati diventeranno visibili dopo l’accettazione della richiesta e la conferma definitiva dell’uscita.";
    }

    return "I dettagli riservati sono disponibili soltanto ai partecipanti confermati.";
  }

  if (
    (tripStatus === "confirmed" || tripStatus === "completed") &&
    (participationStatus === "confirmed" || participationStatus === "completed")
  ) {
    return "L’organizzatore non ha ancora pubblicato le indicazioni riservate.";
  }

  return "I dettagli riservati non sono disponibili per questa partecipazione.";
}
