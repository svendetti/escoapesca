import { useEffect, useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { readableError } from "../lib/errors";
import {
  loadTripInviteCandidates,
  sendTripInvitation,
  type TripInviteCandidate,
} from "../lib/tripInvitations";
import { Notice } from "./Notice";

const SKILL_LABELS = { beginner: "Principiante", intermediate: "Intermedio", expert: "Esperto" };
const WATER_LABELS = { sea: "Mare", freshwater: "Acqua dolce", both: "Mare e acqua dolce" };
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DELAY_MS = 250;

export function TripInvitePanel({ tripId, panelId }: { tripId: string; panelId?: string }) {
  const listboxId = useId();
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<TripInviteCandidate[]>([]);
  const [selected, setSelected] = useState<TripInviteCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = search.trim();
    if (selected && query === selected.displayName) {
      setLoading(false);
      return;
    }
    if (query.length < MIN_SEARCH_LENGTH) {
      setCandidates([]);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      void loadTripInviteCandidates(tripId, query)
        .then((loaded) => {
          if (!active) return;
          setCandidates(loaded);
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch((caught) => {
          if (!active) return;
          setCandidates([]);
          setOpen(false);
          setError(readableError(caught));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, SEARCH_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, selected, tripId]);

  function choose(candidate: TripInviteCandidate) {
    setSelected(candidate);
    setSearch(candidate.displayName);
    setCandidates([]);
    setOpen(false);
    setActiveIndex(-1);
    setNotice(null);
    setError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && candidates.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current < candidates.length - 1 ? current + 1 : 0);
    } else if (event.key === "ArrowUp" && candidates.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current > 0 ? current - 1 : candidates.length - 1);
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      choose(candidates[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  async function invite(candidate: TripInviteCandidate) {
    setBusyUserId(candidate.userId);
    setNotice(null);
    setError(null);
    try {
      const result = await sendTripInvitation(tripId, candidate.userId);
      const invited = { ...candidate, alreadyInvited: true };
      setSelected(invited);
      setNotice(result.sentNow
        ? `Invito inviato a ${candidate.displayName}. Riceverà una notifica e potrà chiedere di partecipare.`
        : `${candidate.displayName} era già stato invitato.`);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusyUserId(null);
    }
  }

  const queryReady = search.trim().length >= MIN_SEARCH_LENGTH && !selected;
  const showOptions = open && !loading && candidates.length > 0;

  return (
    <section className="trip-detail-card trip-invite-panel" id={panelId}>
      <div className="trip-invite-heading">
        <div>
          <h2>Invita un utente EscoAPesca</h2>
          <p>Scrivi il nome e seleziona un utente della piattaforma. Puoi cercare anche per comune o zona.</p>
        </div>
      </div>

      <div
        className="trip-invite-combobox"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <label htmlFor={`${listboxId}-input`}>Nome</label>
        <input
          id={`${listboxId}-input`}
          aria-activedescendant={showOptions && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showOptions}
          autoComplete="off"
          maxLength={80}
          placeholder="Inizia a scrivere un nome"
          role="combobox"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelected(null);
            setNotice(null);
            setOpen(true);
          }}
          onFocus={() => {
            if (candidates.length) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        {showOptions && (
          <div className="trip-invite-options" id={listboxId} role="listbox">
            {candidates.map((candidate, index) => (
              <button
                className={`trip-invite-option ${index === activeIndex ? "is-active" : ""}`}
                id={`${listboxId}-option-${index}`}
                key={candidate.userId}
                role="option"
                aria-selected={index === activeIndex}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(candidate)}
              >
                <strong>{candidate.displayName}</strong>
                <span>
                  {[candidate.municipalityName, candidate.genericZone].filter(Boolean).join(" · ")}
                  {candidate.alreadyInvited ? " · Già invitato" : ""}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="trip-invite-search-status" aria-live="polite">
          {loading
            ? "Ricerca…"
            : !search.trim()
              ? "Digita almeno 2 caratteri."
              : !queryReady
                ? ""
                : candidates.length === 0
                  ? "Nessun utente trovato."
                  : `${candidates.length} risultati. Seleziona un nome.`}
        </p>
      </div>

      {selected && (
        <article className="trip-invite-selected">
          <div>
            <strong>{selected.displayName}</strong>
            <p>{[selected.municipalityName, selected.genericZone].filter(Boolean).join(" · ")}</p>
            <p>
              {SKILL_LABELS[selected.skillLevel]} · {WATER_LABELS[selected.waterType]}
              {selected.techniqueNames.length ? ` · ${selected.techniqueNames.join(", ")}` : ""}
            </p>
          </div>
          <button
            className="button button-primary"
            disabled={selected.alreadyInvited || busyUserId !== null}
            type="button"
            onClick={() => void invite(selected)}
          >
            {selected.alreadyInvited
              ? "Invitato"
              : busyUserId === selected.userId ? "Invio…" : "Invita"}
          </button>
        </article>
      )}

      {notice && <Notice kind="success">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
    </section>
  );
}
