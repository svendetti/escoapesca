import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Notice } from "../components/Notice";
import { readableError } from "../lib/errors";
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationCopy,
} from "../lib/notifications";
import type { AppNotification } from "../types/domain";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadNotifications()
      .then((loaded) => {
        if (active) setNotifications(loaded);
      })
      .catch((caught) => {
        if (active) setError(readableError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  async function readOne(notificationId: string) {
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => (
      notification.id === notificationId && !notification.readAt
        ? { ...notification, readAt }
        : notification
    )));
    try {
      await markNotificationRead(notificationId);
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  async function readAll() {
    setMarkingAll(true);
    setError(null);
    try {
      const readAt = await markAllNotificationsRead();
      setNotifications((current) => current.map((notification) => (
        notification.readAt ? notification : { ...notification, readAt }
      )));
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) return <div className="page-status">Caricamento notifiche…</div>;
  const hasUnread = notifications.some((notification) => !notification.readAt);

  return (
    <section className="page-narrow notifications-page">
      <div className="notifications-heading">
        <div>
          <div className="eyebrow">Aggiornamenti</div>
          <h1>Notifiche</h1>
          <p>Richieste, decisioni e cambiamenti delle tue uscite.</p>
        </div>
        {hasUnread && (
          <button className="button button-secondary" disabled={markingAll} type="button" onClick={() => void readAll()}>
            {markingAll ? "Aggiornamento…" : "Segna tutte come lette"}
          </button>
        )}
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      {!error && notifications.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">≈</span>
          <h2>Nessun aggiornamento</h2>
          <p>Qui compariranno richieste, conferme e modifiche alle uscite.</p>
          <Link className="button button-primary" to="/trova-uscita">Trova un’uscita</Link>
        </div>
      ) : (
        <div className="notification-list" aria-live="polite">
          {notifications.map((notification) => {
            const copy = notificationCopy(notification);
            const content = (
              <>
                <div className="notification-card-heading">
                  <strong>{copy.title}</strong>
                  {!notification.readAt && <span>Nuova</span>}
                </div>
                <p>{copy.message}</p>
                <time dateTime={notification.createdAt}>{dateFormatter.format(new Date(notification.createdAt))}</time>
              </>
            );

            return copy.target ? (
              <Link
                className={`notification-card${notification.readAt ? "" : " unread"}`}
                key={notification.id}
                to={copy.target}
                onClick={() => void readOne(notification.id)}
              >
                {content}
              </Link>
            ) : (
              <button
                className={`notification-card${notification.readAt ? "" : " unread"}`}
                key={notification.id}
                type="button"
                onClick={() => void readOne(notification.id)}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
