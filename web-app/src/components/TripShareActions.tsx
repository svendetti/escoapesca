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
  compact = false,
}: {
  data: TripShareData;
  inviteTargetId?: string;
  inviteDisabled?: boolean;
  inviteDisabledReason?: string;
  compact?: boolean;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const inviteReasonId = inviteTargetId ? `${inviteTargetId}-disabled-reason` : undefined;

  async function copyLink() {
    setCopyState(await copyPublicTripLink(data.tripId) ? "copied" : "failed");
  }

  function openInviteSearch() {
    if (!inviteTargetId || inviteDisabled) return;
    window.requestAnimationFrame(() => {
      const target = document.getElementById(inviteTargetId);
      target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      target?.querySelector("input")?.focus({ preventScroll: true });
    });
  }

  const feedback = copyState === "copied"
    ? "Link copiato."
    : copyState === "failed"
      ? "Copia non riuscita: apri la pagina pubblica e copia l’indirizzo."
      : "";

  return (
    <div className={`trip-share-actions${compact ? " trip-share-actions-compact" : ""}`}>
      <a
        className="button button-primary"
        href={whatsappShareUrl(data)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {compact && <img src="/icons/lucide/message-circle.svg" width="20" height="20" alt="" aria-hidden="true" />}
        {compact ? "WhatsApp" : "Condividi su WhatsApp"}
      </a>
      <button className="button button-secondary" type="button" onClick={() => void copyLink()}>
        {compact && <img src="/icons/lucide/copy.svg" width="20" height="20" alt="" aria-hidden="true" />}
        Copia link
      </button>
      {inviteTargetId && (
        <button
          aria-describedby={inviteDisabled && inviteDisabledReason ? inviteReasonId : undefined}
          className="button button-secondary trip-share-invite"
          disabled={inviteDisabled}
          type="button"
          aria-label={compact ? "Invita un utente EscoAPesca" : undefined}
          aria-controls={inviteDisabled ? undefined : inviteTargetId}
          onClick={openInviteSearch}
        >
          {compact && <img src="/icons/lucide/user-round-plus.svg" width="20" height="20" alt="" aria-hidden="true" />}
          {compact ? "Invita" : "Invita un utente EscoAPesca"}
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
