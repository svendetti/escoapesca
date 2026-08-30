import { useState } from "react";
import {
  copyPublicTripLink,
  publicTripUrl,
  shareTripNatively,
  whatsappShareUrl,
  type TripShareData,
} from "../lib/tripShare";

export function TripShareActions({ data }: { data: TripShareData }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [shareState, setShareState] = useState<"idle" | "sharing" | "shared" | "failed">("idle");

  async function copyLink() {
    setCopyState(await copyPublicTripLink(data.tripId) ? "copied" : "failed");
  }

  async function shareNow() {
    if (!globalThis.navigator?.share) {
      globalThis.open(whatsappShareUrl(data), "_blank", "noopener,noreferrer");
      return;
    }

    setShareState("sharing");
    const result = await shareTripNatively(data);
    setShareState(
      result === "shared"
        ? "shared"
        : result === "failed"
          ? "failed"
          : "idle",
    );
  }

  const feedback = shareState === "shared"
    ? "Condivisione completata."
    : shareState === "failed"
      ? "Condivisione non riuscita: usa WhatsApp o copia il link."
      : copyState === "copied"
        ? "Link copiato."
        : copyState === "failed"
          ? "Copia non riuscita: apri la pagina pubblica e copia l’indirizzo."
          : "";

  return (
    <div className="trip-share-actions">
      <button
        className="button button-primary trip-share-native"
        disabled={shareState === "sharing"}
        type="button"
        onClick={() => void shareNow()}
      >
        {shareState === "sharing" ? "Apertura…" : "Condividi subito"}
      </button>
      <a
        className="button button-secondary"
        href={whatsappShareUrl(data)}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </a>
      <button className="button button-secondary" type="button" onClick={() => void copyLink()}>
        Copia link
      </button>
      <a
        className="trip-share-public-link"
        href={publicTripUrl(data.tripId)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Apri pagina pubblica ↗
      </a>
      <span
        className={`trip-share-feedback ${shareState === "failed" || copyState === "failed" ? "is-error" : ""}`}
        aria-live="polite"
      >
        {feedback}
      </span>
    </div>
  );
}
