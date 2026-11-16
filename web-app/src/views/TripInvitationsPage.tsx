import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Notice } from "../components/Notice";
import { TripInvitePanel } from "../components/TripInvitePanel";
import { TripShareActions } from "../components/TripShareActions";
import { useAuth } from "../contexts/AuthContext";
import { readableError } from "../lib/errors";
import { canInviteToTrip, shouldShowTripShare } from "../lib/tripPresentation";
import { loadFishingTrip } from "../lib/trips";
import type { FishingTrip } from "../types/domain";

export function TripInvitationsPage() {
  const { tripId = "" } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState<FishingTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    // Ownership is included in the query as well as enforced by database RLS.
    void loadFishingTrip(user.id, tripId)
      .then((loaded) => { if (active) setTrip(loaded); })
      .catch((caught) => { if (active) setError(readableError(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tripId, user?.id]);

  if (loading) return <div className="page-status">Preparazione degli inviti…</div>;
  if (!trip) return (
    <section className="page-narrow auth-card">
      <h1>Inviti non disponibili</h1>
      {error && <Notice kind="error">{error}</Notice>}
      <Link className="button button-secondary" to="/mie-uscite">Le mie uscite</Link>
    </section>
  );

  const canInvite = canInviteToTrip(trip, true);
  const showShare = shouldShowTripShare(trip) && !trip.hiddenByAdminAt;
  const invitePanelId = `invite-trip-${trip.id}`;
  return (
    <section className="page-narrow trip-invitations-page">
      <Link className="back-link" to={`/uscite/${trip.id}`}>← Dettaglio uscita</Link>
      <div className="eyebrow">Organizza il gruppo</div>
      <h1>Invita e condividi</h1>
      <p className="trip-task-context">{trip.title} · {trip.publicCode}</p>
      <section className="trip-detail-card trip-invitations-card">
        {showShare && <TripShareActions
          compact
          inviteTargetId={invitePanelId}
          inviteDisabled={!canInvite}
          inviteDisabledReason="Gli inviti diretti sono disponibili solo per uscite aperte prima dell’inizio."
          data={{
            tripId: trip.id, publicCode: trip.publicCode, title: trip.title,
            techniqueName: trip.techniqueName, publicZone: trip.publicZone,
            startsAt: trip.startsAt, endsAt: trip.endsAt, endPrecision: trip.endPrecision,
            availablePlaces: null, tripType: trip.tripType,
          }}
        />}
        {canInvite ? <TripInvitePanel tripId={trip.id} panelId={invitePanelId} /> : (
          <Notice kind="info">La ricerca di partecipanti è chiusa per questa uscita.</Notice>
        )}
        {trip.hiddenByAdminAt && <Notice kind="info">L’uscita è oscurata: la condivisione pubblica non è disponibile.</Notice>}
      </section>
    </section>
  );
}
