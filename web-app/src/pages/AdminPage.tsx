import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Notice } from "../components/Notice";
import { useAuth } from "../contexts/AuthContext";
import {
  ADMIN_RESET_CONFIRMATION,
  betaGoalProgress,
  cancelTripAsAdmin,
  formatDecimal,
  formatRatio,
  loadAdminDashboard,
  resetAdminOperationalData,
  setAdminUserStatus,
} from "../lib/admin";
import type { AdminDashboard, AdminTrip, AdminUser } from "../lib/admin";
import { readableError } from "../lib/errors";
import "./admin.css";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});

const statusLabels: Record<string, string> = {
  active: "Attivo", disabled: "Disabilitato", draft: "Bozza", open: "Aperta",
  confirmed: "Confermata", completed: "Conclusa", cancelled: "Annullata",
  requested: "Richiesta", accepted: "Accettata", rejected: "Rifiutata",
  no_show: "Assente",
};

const actionLabels: Record<string, string> = {
  user_disabled: "Utente disabilitato",
  user_reenabled: "Utente riattivato",
  trip_moderated_cancelled: "Uscita annullata dall’Admin",
};

type PendingAction =
  | { kind: "user"; user: AdminUser; nextStatus: "active" | "disabled" }
  | { kind: "trip"; trip: AdminTrip };

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

function yesNo(value: boolean) {
  return value ? "Sì" : "No";
}

export function AdminPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    const loaded = await loadAdminDashboard();
    setDashboard(loaded);
  }, []);

  useEffect(() => {
    let active = true;
    void loadAdminDashboard()
      .then((loaded) => { if (active) setDashboard(loaded); })
      .catch((caught) => { if (active) setError(readableError(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function startAction(action: PendingAction) {
    setResetOpen(false);
    setPendingAction(action);
    setReason("");
    setError(null);
    setSuccess(null);
  }

  function startReset() {
    setPendingAction(null);
    setResetOpen(true);
    setResetConfirmation("");
    setError(null);
    setSuccess(null);
  }

  async function confirmReset() {
    if (
      submitting
      || resetConfirmation.trim().toUpperCase() !== ADMIN_RESET_CONFIRMATION
    ) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await resetAdminOperationalData(resetConfirmation);
      setSuccess(
        `Reset completato: ${result.tripsDeleted} uscite e ${result.operationalRowsDeleted} record operativi eliminati. ${result.usersPreserved} utenti preservati.`,
      );
      setResetOpen(false);
      setResetConfirmation("");
      await refresh();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmAction() {
    if (!pendingAction || submitting) return;
    if (reason.trim().length < 3) {
      setError("Inserisci una motivazione di almeno 3 caratteri.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (pendingAction.kind === "user") {
        await setAdminUserStatus(pendingAction.user.id, pendingAction.nextStatus, reason);
        setSuccess(pendingAction.nextStatus === "disabled" ? "Utente disabilitato." : "Utente riattivato.");
      } else {
        await cancelTripAsAdmin(pendingAction.trip.id, reason);
        setSuccess("Uscita annullata e partecipanti notificati.");
      }
      setPendingAction(null);
      setReason("");
      await refresh();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-status">Caricamento controllo Beta…</div>;
  if (!dashboard) {
    return <section className="page-narrow"><Notice kind="error">{error ?? "Dashboard non disponibile."}</Notice></section>;
  }

  const { metrics } = dashboard;
  const goalProgress = betaGoalProgress(metrics.realTrips);
  const pulseCards = [
    ["Utenti Beta", metrics.registeredUsers],
    ["Nuovi utenti · 7 gg", metrics.newUsers7Days],
    ["Uscite attive", metrics.activeTrips],
    ["Confermate ora", metrics.confirmedStatusTrips],
    ["Da chiudere", metrics.overdueTrips],
    ["Richieste in attesa", metrics.pendingRequests],
    ["Uscite reali", metrics.realTrips],
    ["Feedback mancanti", metrics.missingFeedback],
  ] as const;

  const metricGroups = [
    {
      title: "Utenti",
      cards: [
        ["Attivi", metrics.activeUsers],
        ["Disabilitati", metrics.disabledUsers],
        ["Nuovi · 30 gg", metrics.newUsers30Days],
        ["Profili completati", metrics.completedProfiles],
      ],
    },
    {
      title: "Uscite",
      cards: [
        ["Create", metrics.createdTrips],
        ["Aperte", metrics.openTrips],
        ["Confermate almeno una volta", metrics.confirmedTrips],
        ["Concluse", metrics.completedTrips],
        ["Annullate", metrics.cancelledTrips],
        ["Aperte senza richieste", metrics.openTripsWithoutRequests],
        ["Posti disponibili", metrics.availablePlaces],
      ],
    },
    {
      title: "Richieste e feedback",
      cards: [
        ["Richieste totali", metrics.participationRequests],
        ["Accettate", metrics.acceptedRequests],
        ["Rifiutate", metrics.rejectedRequests],
        ["Annullate dall’utente", metrics.cancelledRequests],
        ["Feedback ricevuti", metrics.feedbackReceived],
        ["Valutazione media", metrics.averageRating === null ? "—" : `${formatDecimal(metrics.averageRating)}/5`],
        ["Pescherebbe di nuovo", formatRatio(metrics.wouldRepeatRatio)],
        ["Uscite dichiarate", metrics.reportedTrips],
        ["Utenti alla seconda uscita", metrics.repeatParticipants],
      ],
    },
    {
      title: "Conversioni",
      cards: [
        ["Registrazione → profilo", formatRatio(metrics.profileCompletionRatio)],
        ["Registrati → partecipazione", formatRatio(metrics.registeredToParticipationRatio)],
        ["Richiesta → accettazione", formatRatio(metrics.requestAcceptanceRatio)],
        ["Creata → realmente svolta", formatRatio(metrics.createdToRealTripRatio)],
        ["Confermata → realmente svolta", formatRatio(metrics.confirmedToRealTripRatio)],
        ["Feedback completati", formatRatio(metrics.feedbackCompletionRatio)],
        ["Richieste medie per uscita", formatDecimal(metrics.averageRequestsPerTrip, 2)],
      ],
    },
  ] as const;

  return (
    <section className="admin-page">
      <header className="admin-heading">
        <div>
          <div className="eyebrow">Amministrazione riservata</div>
          <h1>Controllo Beta Lazio</h1>
          <p>Misura il percorso dal primo accesso fino a un’uscita reale tra pescatori che non si conoscevano.</p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => void refresh()}>Aggiorna</button>
      </header>

      {error && <Notice kind="error">{error}</Notice>}
      {success && <Notice kind="success">{success}</Notice>}

      <section className="admin-goal" aria-label="Obiettivo Beta">
        <div><span>Milestone iniziale</span><strong>{metrics.realTrips}/5 uscite reali</strong></div>
        <div className="admin-progress" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={Math.min(metrics.realTrips, 5)}>
          <span style={{ width: `${goalProgress}%` }} />
        </div>
        <p>{goalProgress < 100 ? `Mancano ${Math.max(0, 5 - metrics.realTrips)} uscite validate.` : "Prima milestone raggiunta."}</p>
      </section>

      <section className="admin-metric-overview" aria-labelledby="admin-pulse-title">
        <div className="admin-metric-heading">
          <h2 id="admin-pulse-title">Polso operativo</h2>
          <p>Esclude gli account di test. Attive: aperte o confermate e non terminate. Da chiudere: terminate ma ancora aperte o confermate.</p>
        </div>
        <div className="admin-metrics admin-metrics-pulse">
          {pulseCards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
        </div>
      </section>

      <section className="admin-metric-groups" aria-label="Dettaglio metriche Beta">
        {metricGroups.map((group) => (
          <article className="admin-metric-group" key={group.title}>
            <h2>{group.title}</h2>
            <div className="admin-metrics">
              {group.cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
            </div>
          </article>
        ))}
      </section>

      <section className="admin-danger-zone" aria-labelledby="admin-reset-title">
        <div>
          <div className="eyebrow">Strumenti di test · solo Admin</div>
          <h2 id="admin-reset-title">Azzera i dati operativi</h2>
          <p>
            Elimina uscite, richieste, partecipazioni, dettagli privati, feedback,
            notifiche, eventi, email in coda e registro moderazione.
            Account, profili, preferenze, consensi e ruoli restano invariati.
          </p>
        </div>
        <button className="button button-danger" type="button" onClick={startReset}>
          Elimina tutti i dati operativi
        </button>
      </section>

      <details className="admin-section" open>
        <summary>Utenti <span>{dashboard.users.length}</span></summary>
        <div className="admin-list">
          {dashboard.users.map((appUser) => (
            <article className="admin-card" key={appUser.id}>
              <div className="admin-card-title">
                <div><strong>{appUser.displayName}</strong><small>{appUser.email}</small></div>
                <span className={`admin-status ${appUser.status}`}>{statusLabels[appUser.status]}</span>
              </div>
              <dl>
                <div><dt>Zona</dt><dd>{[appUser.municipalityName, appUser.provinceCode].filter(Boolean).join(" · ") || "Non indicata"}</dd></div>
                <div><dt>Profilo</dt><dd>{appUser.profileCompletedAt ? "Completo" : "Incompleto"}</dd></div>
                <div><dt>Email</dt><dd>{appUser.emailVerifiedAt ? "Confermata" : "Non confermata"}</dd></div>
                <div><dt>Registrazione</dt><dd>{formatDate(appUser.createdAt)}</dd></div>
              </dl>
              {appUser.id !== user?.id && (
                <button
                  className={`button ${appUser.status === "active" ? "button-danger" : "button-secondary"}`}
                  type="button"
                  onClick={() => startAction({ kind: "user", user: appUser, nextStatus: appUser.status === "active" ? "disabled" : "active" })}
                >
                  {appUser.status === "active" ? "Disabilita utente" : "Riattiva utente"}
                </button>
              )}
            </article>
          ))}
        </div>
      </details>

      <details className="admin-section" open>
        <summary>Uscite <span>{dashboard.trips.length}</span></summary>
        <div className="admin-list">
          {dashboard.trips.map((trip) => (
            <article className="admin-card" key={trip.id}>
              <div className="admin-card-title">
                <div><Link to={`/uscite/${trip.id}`}><strong>{trip.title}</strong></Link><small>{trip.organizerName} · {trip.techniqueName}</small></div>
                <span className={`admin-status ${trip.status}`}>{statusLabels[trip.status] ?? trip.status}</span>
              </div>
              <dl>
                <div><dt>Quando</dt><dd>{formatDate(trip.startsAt)}</dd></div>
                <div><dt>Zona pubblica</dt><dd>{trip.publicZone} · {trip.provinceCode}</dd></div>
                <div><dt>Partecipazioni</dt><dd>{trip.participantCount} totali · {trip.pendingCount} in attesa</dd></div>
                <div><dt>Tipo</dt><dd>{trip.tripType === "protected" ? "Protetta" : "Libera"}</dd></div>
              </dl>
              {!(["completed", "cancelled"].includes(trip.status)) && (
                <button className="button button-danger" type="button" onClick={() => startAction({ kind: "trip", trip })}>Annulla come Admin</button>
              )}
            </article>
          ))}
        </div>
      </details>

      <details className="admin-section">
        <summary>Partecipazioni <span>{dashboard.participations.length}</span></summary>
        <div className="admin-list compact">
          {dashboard.participations.length === 0 && <p className="admin-empty">Nessuna partecipazione.</p>}
          {dashboard.participations.map((participation) => (
            <article className="admin-card" key={participation.id}>
              <div className="admin-card-title"><div><strong>{participation.userName}</strong><small>{participation.tripTitle}</small></div><span className={`admin-status ${participation.status}`}>{statusLabels[participation.status] ?? participation.status}</span></div>
              <small>Richiesta il {formatDate(participation.requestedAt)}</small>
            </article>
          ))}
        </div>
      </details>

      <details className="admin-section">
        <summary>Feedback privati <span>{dashboard.feedback.length}</span></summary>
        <div className="admin-list compact">
          {dashboard.feedback.length === 0 && <p className="admin-empty">Nessun feedback raccolto.</p>}
          {dashboard.feedback.map((feedback) => (
            <article className="admin-card" key={feedback.id}>
              <div className="admin-card-title"><div><strong>{feedback.authorName}</strong><small>{feedback.tripTitle}</small></div><span className="admin-rating">{feedback.rating}/5 ★</span></div>
              <dl>
                <div><dt>Svolta</dt><dd>{yesNo(feedback.tripHappened)}</dd></div>
                <div><dt>Nuovo pescatore</dt><dd>{yesNo(feedback.metNewFisher)}</dd></div>
                <div><dt>Ripeterebbe</dt><dd>{yesNo(feedback.wouldRepeat)}</dd></div>
              </dl>
              {feedback.comment && <p className="admin-comment">{feedback.comment}</p>}
            </article>
          ))}
        </div>
      </details>

      <details className="admin-section">
        <summary>Registro moderazione <span>{dashboard.actions.length}</span></summary>
        <div className="admin-list compact">
          {dashboard.actions.length === 0 && <p className="admin-empty">Nessuna azione amministrativa.</p>}
          {dashboard.actions.map((action) => (
            <article className="admin-card" key={action.id}>
              <strong>{actionLabels[action.actionType] ?? action.actionType}</strong>
              <small>{action.actorName} · {formatDate(action.createdAt)}</small>
              <p>{action.targetUserName ?? action.targetTripTitle ?? "Elemento non più disponibile"}</p>
              <p className="admin-comment">Motivo: {action.reason}</p>
            </article>
          ))}
        </div>
      </details>

      {pendingAction && (
        <div className="admin-modal-backdrop" role="presentation">
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-action-title">
            <div className="eyebrow">Conferma moderazione</div>
            <h2 id="admin-action-title">
              {pendingAction.kind === "trip"
                ? `Annulla “${pendingAction.trip.title}”`
                : `${pendingAction.nextStatus === "disabled" ? "Disabilita" : "Riattiva"} ${pendingAction.user.displayName}`}
            </h2>
            <p>La motivazione verrà conservata nel registro amministrativo.</p>
            <label>Motivazione
              <textarea maxLength={1000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} autoFocus />
            </label>
            <div className="admin-modal-actions">
              <button className="button button-secondary" disabled={submitting} type="button" onClick={() => setPendingAction(null)}>Indietro</button>
              <button className="button button-danger" disabled={submitting || reason.trim().length < 3} type="button" onClick={() => void confirmAction()}>
                {submitting ? "Salvataggio…" : "Conferma"}
              </button>
            </div>
          </section>
        </div>
      )}


      {resetOpen && (
        <div className="admin-modal-backdrop" role="presentation">
          <section
            className="admin-modal admin-reset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-reset-dialog-title"
            aria-describedby="admin-reset-warning"
          >
            <div className="eyebrow">Operazione irreversibile</div>
            <h2 id="admin-reset-dialog-title">Elimina tutti i dati operativi</h2>
            <p id="admin-reset-warning">
              Le uscite e ogni dato collegato verranno eliminati definitivamente.
              Gli utenti registrati e i loro profili saranno conservati.
            </p>
            {error && <Notice kind="error">{error}</Notice>}
            <label>
              Scrivi <strong className="admin-confirmation-token">{ADMIN_RESET_CONFIRMATION}</strong> per continuare
              <input
                autoComplete="off"
                autoFocus
                spellCheck={false}
                value={resetConfirmation}
                onChange={(event) => setResetConfirmation(event.target.value)}
              />
            </label>
            <div className="admin-modal-actions">
              <button
                className="button button-secondary"
                disabled={submitting}
                type="button"
                onClick={() => {
                  setResetOpen(false);
                  setResetConfirmation("");
                }}
              >
                Annulla
              </button>
              <button
                className="button button-danger"
                disabled={
                  submitting
                  || resetConfirmation.trim().toUpperCase() !== ADMIN_RESET_CONFIRMATION
                }
                type="button"
                onClick={() => void confirmReset()}
              >
                {submitting ? "Eliminazione…" : "Elimina definitivamente"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
