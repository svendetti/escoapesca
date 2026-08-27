# EscoAPesca — checklist di deploy

## Stato del deploy

- [x] Pubblicazione su GitHub Pages dalla branch `main`, cartella root.
- [x] Dominio personalizzato `www.escoapesca.it` configurato tramite `CNAME`.
- [x] Landing collegata a registrazione, accesso, ricerca e creazione uscita su `app.escoapesca.it`.
- [x] Contatti reali, consenso obbligatorio, Termini e informativa privacy collegati.
- [x] UTM inoltrate ai principali punti di ingresso dell’app.
- [ ] Revisione legale finale dell'informativa rispetto al trattamento effettivo.
- [ ] Configurazione analytics e conversioni, se necessarie, con gestione del consenso.
- [ ] Immagine Open Graph raster 1200×630.
- [x] Test del percorso pubblico landing → registrazione/accesso e dei collegamenti principali.

## Confini della baseline

Il deploy pubblico comprende landing, privacy e termini su GitHub Pages. Gli STEP 3–7 (autenticazione, profilo, creazione/gestione uscite, elenco con filtri, richiesta/annullamento partecipazione, accettazione/rifiuto e conferma dell’uscita) sono implementati in `web-app/`, collegati al progetto Supabase dedicato `EscoAPesca Beta` e pubblicati su `app.escoapesca.it`. Dettagli privati, dashboard completa delle partecipazioni, feedback, amministrazione e notifiche utente non sono ancora implementati.

La landing va mantenuta separata dalla futura applicazione Beta: non deve diventare il contenitore della logica autenticata né dei dati privati degli spot.

La SPA usa un adattatore vinext minimale per il runtime Sites, mantenendo invariati componenti e flussi React esistenti. Le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` sono configurate sull'hosting; Site URL e Redirect URLs sono allineati in Supabase Auth al dominio personalizzato.

### Record DNS OVH attivi per la SPA

- `CNAME app -> custom-domains.chatgpt.site.`
- `TXT _openai-site-verification.app -> openai-site-verification=jJmJGG04eWxD5wABZIMoD0M0OTNSQ6hpUfOR8Oux5hI`
- `TXT _cf-custom-hostname.app -> 65f319ac-bb25-4f53-90de-50f34bb1a026`

## Prestazioni

- Attivare Brotli, con gzip come fallback.
- Servire HTML con `Cache-Control: no-cache`.
- Servire asset versionati con `Cache-Control: public, max-age=31536000, immutable`.
- Usare HTTP/2 o HTTP/3 e una CDN europea.
- Valutare il self-hosting di Three.js e dei font dopo il primo test pubblico.

## Header consigliati

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-src 'none'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Verifica finale

Eseguire PageSpeed Insights e Search Console sull’URL HTTPS definitivo. Controllare LCP, INP, CLS, indicizzazione, sitemap, canonical e anteprima social.

## Email transazionali P0.8

Il delivery usa `app_events` e le notifiche in-app esistenti come sorgente. La tabella `email_outbox` mantiene uno stato separato e non contiene indirizzi email. Il worker `process-email-outbox` risolve l’indirizzo esclusivamente tramite Supabase Auth Admin, usa deep-link autenticati verso `app.escoapesca.it` e non riceve coordinate, punti precisi o note private.

Configurazione richiesta nei secret della Edge Function:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=<secret provider>
EMAIL_FROM=EscoAPesca <mittente-verificato@example.com>
APP_BASE_URL=https://app.escoapesca.it
```

`RESEND_API_URL` è opzionale e usa come default `https://api.resend.com/emails`. Se provider, API key o mittente non sono configurati, il worker risponde con errore di configurazione prima di prelevare righe: le consegne restano `pending` e il flusso utente non viene coinvolto.

Il job Cron `escoapesca-process-email-outbox` richiama il worker ogni minuto. URL progetto e chiave pubblicabile sono conservati in Supabase Vault con i nomi `escoapesca_project_url` e `escoapesca_publishable_key`; non devono essere inseriti in migration o file sorgente. Il provider riceve l’ID del delivery come `Idempotency-Key`, mentre il database impone l’unicità di evento, destinatario e canale.

Verifiche operative:

```sql
select status, count(*) from public.email_outbox group by status order by status;
select jobid, jobname, schedule, active from cron.job where jobname = 'escoapesca-process-email-outbox';
select status, start_time, end_time, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'escoapesca-process-email-outbox')
order by start_time desc
limit 10;
```

Gli errori definitivi restano in `email_outbox.last_error` dopo cinque tentativi. Per evitare esposizioni, non loggare mai l’indirizzo del destinatario o contenuti privati.
