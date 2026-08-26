import { useState } from "react";
import {
  copyPublicTripLink,
  publicTripUrl,
  whatsappShareUrl,
  type TripShareData,
} from "../lib/tripShare";

export function TripShareActions({ data }: { data: TripShareData }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyLink() {
    setCopyState(await copyPublicTripLink(data.tripId) ? "copied" : "failed");
  }

  return (
    <div className="trip-share-actions">
      <a
        className="button button-primary"
        href={whatsappShareUrl(data)}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </a>
      <button className="button button-secondary" type="button" onClick={() => void copyLink()}>
        Copia link
      </button>
      <a className="trip-share-public-link" href={publicTripUrl(data.tripId)} target="_blank" rel="noopener noreferrer">
        Apri pagina pubblica ↗
      </a>
      <span className="trip-share-feedback" aria-live="polite">
        {copyState === "copied" ? "Link copiato." : copyState === "failed" ? "Copia non riuscita: apri la pagina pubblica e copia l’indirizzo." : ""}
      </span>
    </div>
  );
}
