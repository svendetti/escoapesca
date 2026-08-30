import { useEffect, useState } from "react";
import { readableError } from "../lib/errors";
import { loadTripGroupMembers, type TripGroupMember } from "../lib/trips";

export function TripGroupPanel({ tripId, enabled }: { tripId: string; enabled: boolean }) {
  const [members, setMembers] = useState<TripGroupMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void loadTripGroupMembers(tripId)
      .then((loaded) => { if (active) setMembers(loaded); })
      .catch((caught) => { if (active) setError(readableError(caught)); });
    return () => { active = false; };
  }, [enabled, tripId]);

  if (!enabled) return null;

  return (
    <section className="trip-detail-card trip-group-panel">
      <div>
        <h2>Il gruppo</h2>
        <p>Visibile solo all’organizzatore e ai partecipanti accettati.</p>
      </div>
      {error ? <p className="form-error">{error}</p> : (
        <ul className="trip-group-list">
          {members.map((member) => (
            <li key={member.userId}>
              <span className="member-avatar" aria-hidden="true">
                {member.displayName.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span>
                <strong>{member.displayName}</strong>
                <small>{member.role === "organizer" ? "Organizzatore" : "Partecipante"}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
