import { useState } from "react";
import {
  copyPublicTripLink,
  publicTripUrl,
  whatsappShareUrl,
  type TripShareData,
} from "../lib/tripShare";

export function TripShareActions({
  data,
  inviteTargetId,
  inviteDisabled = false,
  inviteDisabledReason,
}: {
  data: TripShareData;
  inviteTargetId?: string;
  inviteDisabled?: boolean;
  inviteDisabledReason?: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const inviteReasonId = inviteTargetId ? `${inviteTargetId}-disabled-reason` : undefined;

  async function copyLink() {
    setCopyState(await copyPublicTripLink(data.tripId) ? "copied" : "failed");
  }

  function openInviteSearch() {
    if (!inviteTargetId || inviteDisabled) return;
    const target = document.getElementById(inviteTargetId);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target?.querySelector("input")?.focus(), 350);
  }

  const feedback = copyState === "copied"
    ? "Link copiato."
    : copyState === "failed"
      ? "Copia non riuscita: apri la pagina pubblica e copia l’indirizzo."
      : "";

  return (
    <div className="trip-share-actions">
      <a
        className="button button-primary"
        href={whatsappShareUrl(data)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Condividi su WhatsApp
      </a>
      <button className="button button-secondary" type="button" onClick={() => void copyLink()}>
        Copia link
      </button>
      {inviteTargetId && (
        <button
          aria-describedby={inviteDisabled && inviteDisabledReason ? inviteReasonId : undefined}
          className="button button-secondary trip-share-invite"
          disabled={inviteDisabled}
          type="button"
          onClick={openInviteSearch}
        >
          Invita un utente EscoAPesca
        </button>
      )}
      {inviteDisabled && inviteDisabledReason && (
        <p className="trip-share-invite-reason" id={inviteReasonId}>{inviteDisabledReason}</p>
      )}
      <a
        className="trip-share-public-link"
        href={publicTripUrl(data.tripId)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Apri pagina pubblica ↗
      </a>
      <span
        className={`trip-share-feedback ${copyState === "failed" ? "is-error" : ""}`}
        aria-live="polite"
      >
        {feedback}
      </span>
    </div>
  );
}