import {
  canRequestPublicTrip,
  publicTripPhase,
  publicTripShareDescription,
  type PublicFishingTrip,
  type PublicTripPhase,
} from "../../../src/lib/publicTrip";
import { PublicTripAction } from "./PublicTripAction";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { tripId: string } | Promise<{ tripId: string }>;
};

type PublicTripRow = {
  id: string;
  title: string;
  technique_name: string;
  water_type: PublicFishingTrip["waterType"];
  starts_at: string;
  ends_at: string;
  province_code: string;
  province_name: string;
  public_zone: string;
  public_meeting_point: string | null;
  max_participants: number;
  available_places: number | null;
  recommended_level: PublicFishingTrip["recommendedLevel"];
  description: string;
  trip_type: PublicFishingTrip["tripType"];
  status: PublicFishingTrip["status"];
};

const APP_ORIGIN = "https://app.escoapesca.it";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PHASE_LABELS: Record<PublicTripPhase, string> = {
  open: "Uscita aperta",
  full: "Posti esauriti",
  confirmed: "Uscita confermata",
  cancelled: "Uscita annullata",
  completed: "Uscita conclusa",
};

const LEVEL_LABELS: Record<PublicFishingTrip["recommendedLevel"], string> = {
  any: "Qualsiasi livello",
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Esperto",
};

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
});

const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

function runtimeConfig() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL?.trim() ?? "",
    supabasePublishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
  };
}

function mapPublicTrip(row: PublicTripRow): PublicFishingTrip {
  return {
    id: row.id,
    title: row.title,
    techniqueName: row.technique_name,
    waterType: row.water_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    provinceCode: row.province_code,
    provinceName: row.province_name,
    publicZone: row.public_zone,
    publicMeetingPoint: row.public_meeting_point,
    maxParticipants: row.max_participants,
    availablePlaces: row.available_places,
    recommendedLevel: row.recommended_level,
    description: row.description,
    tripType: row.trip_type,
    status: row.status,
  };
}

async function loadPublicTrip(tripId: string) {
  if (!UUID_PATTERN.test(tripId)) return null;
  const config = runtimeConfig();
  if (!config.supabaseUrl || !config.supabasePublishableKey) return null;

  try {
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/rpc/get_public_fishing_trip`,
      {
        method: "POST",
        headers: {
          apikey: config.supabasePublishableKey,
          authorization: `Bearer ${config.supabasePublishableKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ p_trip_id: tripId }),
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const rows = await response.json() as PublicTripRow[];
    return rows[0] ? mapPublicTrip(rows[0]) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { tripId } = await params;
  const trip = await loadPublicTrip(tripId);
  const canonical = `${APP_ORIGIN}/u/${tripId}`;

  if (!trip) {
    return {
      title: "Uscita non disponibile — EscoAPesca",
      description: "Questa uscita non è disponibile.",
      robots: { index: false, follow: true },
      alternates: { canonical },
    };
  }

  const title = `${trip.title} — EscoAPesca`;
  const description = publicTripShareDescription(trip);
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: "EscoAPesca",
      url: canonical,
      title,
      description,
    },
  };
}

export default async function PublicTripPage({ params }: PageProps) {
  const { tripId } = await params;
  const trip = await loadPublicTrip(tripId);
  const config = runtimeConfig();

  if (!trip) {
    return (
      <main className="public-trip-shell">
        <header className="public-trip-header">
          <a className="public-trip-brand" href="/">EscoA<span>Pesca</span></a>
          <a href="/trova-uscita">Trova un’uscita</a>
        </header>
        <section className="public-trip-unavailable">
          <p className="eyebrow">Link uscita</p>
          <h1>Uscita non disponibile</h1>
          <p>Il link non è valido oppure l’uscita non può essere mostrata.</p>
          <a className="button button-primary" href="/trova-uscita">Scopri le uscite</a>
        </section>
      </main>
    );
  }

  const startsAt = new Date(trip.startsAt);
  const endsAt = new Date(trip.endsAt);
  const phase = publicTripPhase(trip);
  const canRequest = canRequestPublicTrip(trip);

  return (
    <main className="public-trip-shell">
      <header className="public-trip-header">
        <a className="public-trip-brand" href="/">EscoA<span>Pesca</span></a>
        <a href="/trova-uscita">Trova un’uscita</a>
      </header>

      <article className="public-trip-page">
        <div className="public-trip-hero">
          <div className="public-trip-badges">
            <span className={`trip-status status-${trip.status}`}>{PHASE_LABELS[phase]}</span>
            <span className="trip-privacy">
              {trip.tripType === "protected" ? "Spot protetto" : "Uscita libera"}
            </span>
          </div>
          <p className="eyebrow">Uscita condivisa su EscoAPesca</p>
          <h1>{trip.title}</h1>
          <p className="public-trip-date">
            {dateFormatter.format(startsAt)} · {timeFormatter.format(startsAt)}–{timeFormatter.format(endsAt)}
          </p>
          <p className="public-trip-zone">{trip.publicZone} · {trip.provinceName}</p>
        </div>

        <div className="public-trip-grid">
          <section className="trip-detail-card">
            <h2>Informazioni pubbliche</h2>
            <dl className="trip-data-list">
              <div><dt>Tecnica</dt><dd>{trip.techniqueName}</dd></div>
              <div><dt>Acqua</dt><dd>{trip.waterType === "sea" ? "Mare" : "Acqua dolce"}</dd></div>
              <div><dt>Zona generica</dt><dd>{trip.publicZone} · {trip.provinceCode}</dd></div>
              <div><dt>Livello</dt><dd>{LEVEL_LABELS[trip.recommendedLevel]}</dd></div>
              <div><dt>Partecipanti</dt><dd>{trip.maxParticipants} totali, organizzatore incluso</dd></div>
              {trip.availablePlaces !== null && (
                <div><dt>Posti disponibili</dt><dd>{trip.availablePlaces}</dd></div>
              )}
            </dl>
          </section>

          <section className="trip-detail-card">
            <h2>Descrizione</h2>
            <p className="preserve-lines">{trip.description}</p>
          </section>
        </div>

        {trip.tripType === "protected" ? (
          <section className="public-trip-privacy-note">
            <strong>Lo spot preciso non è pubblico.</strong>
            <p>Coordinate, punto d’incontro e note private restano separati da questa pagina e sono visibili soltanto agli utenti autorizzati dal flusso di conferma.</p>
          </section>
        ) : trip.publicMeetingPoint ? (
          <section className="trip-detail-card">
            <h2>Indicazioni pubbliche</h2>
            <p className="preserve-lines">{trip.publicMeetingPoint}</p>
          </section>
        ) : null}

        {canRequest ? (
          <section className="public-trip-cta">
            <div>
              <h2>Vuoi unirti a questa uscita?</h2>
              <p>Invia la richiesta: l’organizzatore sceglierà il gruppo prima della conferma.</p>
            </div>
            <PublicTripAction
              tripId={trip.id}
              supabaseUrl={config.supabaseUrl}
              supabasePublishableKey={config.supabasePublishableKey}
            />
          </section>
        ) : (
          <section className="public-trip-readonly">
            <h2>{PHASE_LABELS[phase]}</h2>
            <p>Questa pagina resta consultabile, ma non accetta nuove richieste.</p>
          </section>
        )}
      </article>

      <footer className="public-trip-footer">
        <span>EscoAPesca · Beta Lazio</span>
        <span><a href="https://www.escoapesca.it/privacy-beta.html">Privacy</a> · <a href="https://www.escoapesca.it/termini.html">Termini</a></span>
      </footer>
    </main>
  );
}
