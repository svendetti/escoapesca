# EscoAPesca Beta web app

Applicazione della Beta Lazio: SPA React Router e pagina pubblica server `/u/:tripId`, ospitate tramite vinext/Cloudflare Sites. Il sito pubblico nella root resta indipendente.

Sono presenti autenticazione, profilo, uscite, richieste/conferma, dettagli privati, storico, feedback, notifiche, inviti e amministrazione. Presenza del codice e collaudo completo sono distinti: stato, limiti e verifiche aggiornati sono nel [rapporto del 14 novembre 2026](../docs/PROJECT_REVIEW_2026-11-14.md).

## Configurazione locale

Per il collaudo isolato senza usare configurazioni di produzione seguire prima [tools/functional-test/README.md](../tools/functional-test/README.md), quindi `python tools/functional-test/serve.py` dalla root. Il server vinext usa la porta 3000. Questo percorso sovrascrive nell'ambiente del processo le due variabili pubbliche con quelle locali; non modifica `.env.local`.

1. Crea un progetto Supabase dedicato a EscoAPesca.
2. Applica in ordine le migrazioni e il seed descritti in `../database/OPERATIONS.md`.
3. Copia `.env.example` in `.env.local`.
4. Inserisci Project URL e publishable key. Non usare mai la `service_role` nel browser.
5. In Supabase Auth configura Site URL e Redirect URLs per l'origine locale e quella di produzione.

```powershell
npm.cmd ci
npm.cmd run dev
```

## Verifica

```powershell
npm.cmd test
npm.cmd run build
```

Le pagine React della SPA risiedono in `src/views/`: `src/pages/` attiverebbe involontariamente il Pages Router di vinext. `app/[[...path]]` monta la SPA; `app/u/[tripId]` rende la pagina pubblica e i metadata sul server. Il passaggio da React Router a `/u/:tripId` richiede una navigazione del documento, gestita da `PublicTripRedirect` anche al ritorno da login/profilo.

La pubblicazione richiede il worker server e la configurazione runtime `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`; copiare solo asset statici o applicare un rewrite universale a `index.html` non basta. `public/_redirects` e `index.html` sono residui del precedente hosting SPA, non la configurazione del runtime corrente. Non usare chiavi server nel client.

`npm.cmd start` avvia la build su porta 3000. `build:release` richiede modifiche tracciate già committate; durante lo sviluppo usare `build`. Il commit mostrato nell'interfaccia non attesta da solo che il working tree sia pulito.

Per lo smoke test locale della build con configurazione runtime esplicita:

```powershell
node --env-file=.env.local scripts/start.mjs start --port 3001
```

Controlli aggiuntivi dalla root:

```powershell
python tools/validate_database_schema.py
python tools/validate_step3.py
node --test supabase/functions/process-email-outbox/email-content.test.mjs supabase/functions/process-push-outbox/push-content.test.mjs supabase/functions/process-push-outbox/push-delivery.test.mjs
```

Gli script Python sono statici; i test Node non inviano notifiche. I contratti SQL vanno eseguiti su un database Supabase isolato secondo `database/OPERATIONS.md`, non sui dati della Beta attiva.

La CI `Verify application` esegue installazione da lockfile, test frontend, build e controlli Python/Node su Node 22/Linux. Un job Windows separato verifica installazione e regressione degli asset statici con percorsi nativi. Il replay SQL e il ciclo Auth/API sono separati, documentati nel tooling locale. La CI non pubblica l'app; GitHub Pages pubblica automaticamente la landing dalla root di `main`.

### Server Node su Windows

Usare `npm.cmd start` o il tooling isolato, che passano da `scripts/start.mjs`.
vinext 0.0.50 registra nella cache statica percorsi con backslash su Windows:
gli URL `/assets/...` non vengono trovati e il catch-all restituisce HTML invece
di JavaScript/CSS, lasciando la pagina su «Caricamento EscoAPesca…».
Il launcher normalizza le sole chiavi della cache, senza modificare `node_modules`
o il worker Cloudflare. Su altri sistemi non interviene. È una compatibilità
temporanea da rivalutare all'aggiornamento di vinext; il test Node incluso in
`npm test` verifica MIME, contenuto degli asset e protezione del manifest.

## Navigazione e gestione uscite

Sotto 900px gli account attivi usano cinque destinazioni in basso: Home, Trova,
Uscite, Avvisi, Profilo. Proponi resta nell'header; profilo, logout e accesso
amministratore sono disponibili anche dal menu account. Desktop mantiene la
navigazione orizzontale. Spazio inferiore, safe area e salvataggio sticky del
profilo tengono conto della barra fissa; il comportamento su telefono resta da
collaudare, inclusa la tastiera virtuale.

Il dettaglio mantiene riepilogo, richieste, conferma, gruppo e punto d'incontro.
Ricerca utenti e condivisione sono nella route `/uscite/:tripId/inviti`, protetta
da AuthGuard e query sul proprietario. Modifica resta in `/uscite/:tripId/modifica`.
Dopo creazione si può scegliere Gestisci l'uscita oppure Invita e condividi.

Vitest usa il plugin React senza le trasformazioni RSC di vinext per verificare
componenti e router reale. La build applicativa continua a usare vinext/Cloudflare.
I test statici non sostituiscono il collaudo visivo o touch.
