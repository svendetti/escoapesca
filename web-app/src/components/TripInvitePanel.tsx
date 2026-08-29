import { FormEvent, useEffect, useState } from "react";
import { readableError } from "../lib/errors";
import {
  loadTripInviteCandidates,
  sendTripInvitation,
  type TripInviteCandidate,
} from "../lib/tripInvitations";
import { Notice } from "./Notice";

const SKILL_LABELS = { beginner: "Principiante", intermediate: "Intermedio", expert: "Esperto" };
const WATER_LABELS = { sea: "Mare", freshwater: "Acqua dolce", both: "Mare e acqua dolce" };

export function TripInvitePanel({ tripId }: { tripId: string }) {
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<TripInviteCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(query = search) {
    setLoading(true);
    setError(null);
    try {
      setCandidates(await loadTripInviteCandidates(tripId, query));
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(""); }, [tripId]);

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    await load(search);
  }

  async function invite(candidate: TripInviteCandidate) {
    setBusyUserId(candidate.userId);
    setNotice(null);
    setError(null);
    try {
      const result = await sendTripInvitation(tripId, candidate.userId);
      setCandidates((current) => current.map((item) => (
        item.userId === candidate.userId ? { ...item, alreadyInvited: true } : item
      )));
      setNotice(result.sentNow
        ? `Invito inviato a ${candidate.displayName}. Riceverà una notifica e potrà chiedere di partecipare.`
        : `${candidate.displayName} era già stato invitato.`);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section className="trip-detail-card trip-invite-panel">
      <div className="trip-invite-heading">
        <div>
          <h2>Invita un pescatore iscritto</h2>
          <p>Cerca per nome o zona. L’invito non riserva il posto: l’utente dovrà inviare la richiesta.</p>
        </div>
      </div>

      <form className="trip-invite-search" onSubmit={(event) => void submitSearch(event)}>
        <label>
          Cerca utenti
          <input
            maxLength={80}
            placeholder="Nome, comune o zona"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="button button-secondary" disabled={loading} type="submit">
          {loading ? "Ricerca…" : "Cerca"}
        </button>
      </form>

      {notice && <Notice kind="success">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      {!loading && !error && candidates.length === 0 ? (
        <p className="trip-invite-empty">Nessun utente disponibile con questi criteri.</p>
      ) : (
        <div className="trip-invite-list" aria-live="polite">
          {candidates.map((candidate) => (
            <article className="trip-invite-candidate" key={candidate.userId}>
              <div>
                <strong>{candidate.displayName}</strong>
                <p>{[candidate.municipalityName, candidate.genericZone].filter(Boolean).join(" · ")}</p>
                <p>
                  {SKILL_LABELS[candidate.skillLevel]} · {WATER_LABELS[candidate.waterType]}
                  {candidate.techniqueNames.length ? ` · ${candidate.techniqueNames.join(", ")}` : ""}
                </p>
              </div>
              <button
                className="button button-primary"
                disabled={candidate.alreadyInvited || busyUserId !== null}
                type="button"
                onClick={() => void invite(candidate)}
              >
                {candidate.alreadyInvited
                  ? "Invitato"
                  : busyUserId === candidate.userId ? "Invio…" : "Invita"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
