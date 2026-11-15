# EscoAPesca: stato reale e interventi verificabili

Aggiornamento successivo: [collaudo locale del 14–15 novembre](FUNCTIONAL_QA_2026-11-15.md), con replay da database nuovo, contratti SQL, ciclo API sintetico, correzione della RPC gruppo e audit npm ridotto a tre moderate. Il collaudo visivo rimane bloccato dal browser.

Data: 14 novembre 2026. Baseline Git: `ba1afcb`, app `0.1.9`.
Rapporto iniziale salvato **prima degli interventi sul codice**; gli esiti finali sono aggiunti in fondo.

## Perimetro e metodo

Letti README, DEPLOYMENT, piano operativo v1.3, ADR, documentazione database, sorgenti React/vinext, worker, migrazioni e test. Nessun AGENTS.md applicabile trovato; `.agents` non contiene istruzioni. Al primo controllo non risultavano modifiche a file tracciati. Erano già presenti file/cartelle non tracciati: piano v1.0, loghi nella root, `social-calendar/`, `social-launch-kit/`, `supabase/.temp/`, `tools/create_social_motion_video.py`. Sono preservati.

Nessun deploy, push, reset, invio email/push di prova, creazione account o modifica al database/servizi remoti. Su Supabase sono state eseguite solo letture di metadati, advisor e conteggi aggregati, senza estrarre contatti o coordinate. Lo stato remoto può cambiare dopo questa fotografia e non certifica la corrispondenza byte per byte tra sorgenti e deploy.

## Prodotto e percorsi documentati

EscoAPesca è una Beta Lazio per organizzare uscite di pesca tra persone che non si conoscevano. La metrica primaria è l'uscita reale, confermata separatamente da organizzatore e partecipante; un partecipante deve dichiarare di aver conosciuto qualcuno tramite il servizio. Il piano v1.3 richiede prima 5 uscite validate, poi 20: non richiede nuove macrofunzioni prima della validazione.

Percorso principale: landing → pagina pubblica condivisa `/u/:id` oppure registrazione → conferma email esplicita → completamento profilo → ricerca/proposta uscita → richiesta con messaggio opzionale → decisione organizzatore → conferma gruppo → accesso ai dettagli privati → feedback e reminder. Percorsi aggiuntivi: inviti diretti, notifiche interne/email/push, storico, moderazione e metriche admin.

Il prodotto ha un'implementazione estesa del ciclo principale, ma **non è ancora dimostrato affidabile dall'inizio alla fine**. Le suite iniziali coprono prevalentemente funzioni pure, mapping e contratti; non sostituiscono due utenti reali, RLS effettiva, consegna provider e dispositivi mobili.

## Architettura osservata

- Root: landing HTML statica, pagine privacy/termini, asset; pubblicazione GitHub Pages descritta nei documenti.
- `web-app`: React 19, React Router, TypeScript strict; vinext/Vite e worker Cloudflare come adattatore Sites. Catch-all App Router per SPA e pagina server `/u/:tripId` per condivisione/metadata. Versioni dipendenze fissate e lockfile presente.
- Database: 46 migrazioni PostgreSQL/Supabase, 22 contratti SQL e un seed Lazio; identità Supabase Auth, RLS, RPC, bucket foto privato. Nomi/versioni delle prime migrazioni remote differiscono dalla numerazione locale: il confronto iniziale è per nome e ordine, non per checksum.
- Tre Edge Function: email tramite Resend, Web Push tramite VAPID, eliminazione utente disabilitato riservata all'admin. Cron, outbox, backoff e chiavi server separate dal client.
- Test disponibili: Vitest, test Node dei contenuti email/push, due script Python statici. Nessuna pipeline CI tracciata trovata. Mancano test E2E e un bootstrap locale Supabase completo (`supabase/config.toml` assente).

## Cosa è stato verificato prima delle modifiche

| Area | Evidenza | Stato reale |
| --- | --- | --- |
| Compilazione | `npm.cmd run build`: TypeScript e build vinext completati | Verificata localmente; non equivale a deploy |
| Logica app | `npm.cmd test`: 19 file, 88 test verdi | Verificata entro la copertura delle suite |
| Contenuti delivery | `node --test` sui due file `*-content.test.mjs`: 9 test verdi | Test di contenuti, non consegna |
| Contratti statici | Entrambi gli script Python verdi | Controlli testuali su parte dello schema; non parser SQL né test RLS |
| Supabase remoto | Progetto `EscoAPesca Beta` attivo, PostgreSQL 17.6; 46 migrazioni registrate | Verificata presenza della storia; replay locale non verificato |
| Protezioni dati | Tutte le 23 tabelle pubbliche con RLS; 19 anche FORCE RLS; bucket `profile-photos` privato, 3 MB e MIME limitati | Metadati verificati, matrice utenti non rieseguita |
| RPC worker | `claim_*`, `complete_*`, `get_push_worker_config`, `admin_delete_disabled_user` non eseguibili da anon/authenticated | Grant verificati con query di catalogo |
| Job operativi | Tre job attivi; nelle 24 ore osservate 1440 esecuzioni per email/push, 96 per feedback, SQL riuscito | Conferma scheduler; non prova delivery |
| Delivery recente | Cache HTTP pg_net: 720 risposte 200 e una senza status nella finestra conservata; outbox email/push vuote | Nessun arretrato osservato; nessuna prova di recapito con coda vuota |
| Validazione prodotto | 5 account non marcati test, 1 uscita `open`, nessun feedback e nessuna uscita reale validata | La milestone documentata non è dimostrata dai dati |

## Funzioni: implementazione e limiti

| Funzione | Classificazione | Cosa resta da dimostrare/completare |
| --- | --- | --- |
| Landing e collegamenti app | Implementata, esaminata staticamente | Percorso HTTPS e anteprima WhatsApp; Web Vitals reali |
| Registrazione, conferma, login, recupero | Implementati, parzialmente verificati | SMTP/Auth template, redirect, errori token, due browser/dispositivi |
| Profilo e foto | Implementati, parzialmente verificati | Upload reale, isolamento cross-user, errori rete/storage |
| Creazione/modifica/annullamento | Implementati, parzialmente verificati | Transazioni, modifiche concorrenti, date/fusi e casi limite |
| Ricerca e richieste | Implementate, parzialmente verificate | Profili incompleti, capienza concorrente, messaggi e navigazione |
| Accettazione e conferma | Implementate in RPC/UI; test unitari/contratti presenti | Flusso a due utenti con controlli negativi RLS |
| Dettagli privati | Separati per tabella/policy; metadati verificati | Revoca, cancellazione e tutti gli stati con token reali |
| Pagina pubblica/condivisione | Implementata server-side con DTO minimo e noindex | Guasti API, preview social e ritorno dopo onboarding |
| Inviti diretti | Implementati ma percorso incoerente | Link alla scheda autenticata prima che RLS permetta la lettura |
| Notifiche/email/push | Implementate, infrastruttura presente | Recapito, sicurezza endpoint, logout/cambio account sul dispositivo |
| Feedback, reminder, metriche | Implementati, nessun esito reale osservato | Collaudo temporale e feedback incrociati |
| Admin/moderazione/reset/eliminazione | Implementati, guard e grant esaminati | Test isolati; nessuna operazione distruttiva eseguita |
| Installazione PWA | Manifest, icone, service worker e prompt presenti | Installazione/push su iOS e Android; offline non implementato |
| Ranking compatibilità, alert simili, reputation, SEO territoriale | Non implementati come funzionalità complete | P1 esplicitamente successivi alla validazione; non blocchi automatici per la Beta |

Non sono emerse API applicative sostituite da mock in produzione. Il testo della landing con una simulazione dello spot è dimostrativo, non prova di protezione dati. Nei test i client Supabase sono simulati. Matching e promessa di compatibilità non vanno confusi con ricerca per filtri e ordinamento degli inviti.

## Problemi concreti e priorità prima degli interventi

P0 = impedisce uso/pubblicazione sicura del percorso coinvolto; P1 = affidabilità o sicurezza da risolvere prima di ampliare la Beta; P2 = miglioramento circoscritto non bloccante. Le priorità sono valutazioni tecniche, non requisiti di prodotto inventati.

| ID / priorità / natura | Evidenza e file | Conseguenza | Intervento e dipendenze |
| --- | --- | --- | --- |
| D01 / P1 / bug dimostrato | `database/migrations/009_trip_management_rls.sql`: letterali `''active''`, `''open''`, `''public.fishing_trips''` in SQL non dinamico | Replay da zero si interrompe; verde degli script statici insufficiente | Correggere gli apici nel file storico, senza riapplicarlo al remoto; confrontare policy remota e fare replay in ambiente isolato |
| D02 / P1 / bug dimostrato | `src/lib/errors.ts`: `String(error)` per oggetti `{message,code}` restituiti dalle query/RPC | Perdita di errori utili come credenziali, profilo incompleto, posti terminati; invito a riprovare anche quando serve correggere input | Estrarre message in modo sicuro e tradurre solo casi noti, senza mostrare dettagli SQL/provider arbitrari; test regressione |
| D03 / P1 / bug dimostrato | `src/lib/returnPath.ts`: getter protetto, ma `getItem/setItem/removeItem` fuori try/catch; funzioni chiamate anche durante render login/profilo | Storage bloccato o quota esaurita possono impedire onboarding e navigazione | Rendere la persistenza opzionale e conservare il returnTo già presente nell'URL; test Storage che lancia eccezioni |
| D04 / P1 / rischio sicurezza concreto | `20260829161251_web_push_delivery.sql` accetta qualunque endpoint `https://`; `process-push-outbox/index.ts` lo passa a web-push | Un utente può indirizzare richieste dal worker a destinazioni arbitrarie (SSRF/abuso egress); sfruttabilità della rete interna non verificata | Validare destinazioni note prima dell'invio e fallire definitivamente per endpoint non ammessi; test senza rete. Nessuna modifica produzione |
| D05 / P1 / bug di flusso dimostrato | `notifications.ts`, `homeDashboard.ts`, `WelcomePage.tsx`, `push-content.js`: inviti/accettazioni portano a `/uscite/:id`; policy `fishing_trips_select_authorized` consente terzi solo confirmed/completed | Invitato e partecipante accepted aprono una pagina non accessibile; il dettaglio non offre richiesta | Usare pagina pubblica per invito/attesa, preservando confine privato. Un eventuale accesso anticipato alla scheda completa richiede decisione e test RLS separati |
| D06 / P1 / incompletezza dimostrata | `app/u/[tripId]/PublicTripAction.tsx`: invia subito RPC, senza campo messaggio, e ignora `.error` nei risultati delle letture | Link condiviso non offre il messaggio richiesto dalla Definition of Done; errore backend scambiato per profilo incompleto o stato pronto | Allineare richiesta alla discovery; distinguere errore da dato assente; test sul caricamento stato/argomenti RPC |
| D07 / P1 / rischio da validare | `20260830150612_fluid_trip_experience.sql`, `list_trip_group_members`: controllo appartenenza senza controllo esplicito stato attivo del chiamante | Un disabilitato con JWT ancora valido potrebbe leggere nomi del gruppo tramite RPC | Test negativo con token disabilitato in staging, poi eventuale migrazione. Non basta AuthGuard e non basta cercare la parola `active` nel corpo |
| D08 / P1 / rischio da validare | `pushNotifications.ts`, `AppLayout.tsx`, `claim_push_deliveries`: logout non revoca subscription, claim non collega esplicitamente destinatario della notifica al proprietario corrente della subscription | Browser condiviso/cambio account può ricevere avvisi del precedente account; un endpoint riassegnato conserva consegne pendenti | Definire sessione/dispositivo, test cambio account, revoca e claim coerente; modifica SQL da collaudare in staging |
| D09 / P1 / warning operativo confermato | Security Advisor: leaked password protection disabilitata | Password compromesse non rifiutate automaticamente | Valutare impostazione/piano con responsabile; nessuna modifica ai servizi autorizzata in questo incarico |
| D10 / P1 / limite verifiche | Nessuna CI/E2E; 22 test SQL non rieseguiti; manca config locale Supabase | Regressioni RLS/workflow possono sfuggire agli 88 test unitari | Ambiente isolato riproducibile e collaudo due utenti; non usare test con INSERT/reset su produzione |
| D11 / P2 / costo osservabile | `trips.ts`: firma URL per ogni uscita anche con stesso organizzatore; home ne carica fino a 50 e mostra 3; summary richieste una RPC per uscita | Chiamate crescenti con risultati/uscite, latenza e carico storage/RPC | Deduplicare firme o batch misurando conteggi; cambiare aggregazioni SQL solo con benchmark e staging |
| D12 / P2 / bug configurazione build | Build rileva `src/pages` come Pages Router e genera anche `/AdminPage`, `/LoginPage`, ecc. oltre alle vere rotte SPA | Bundle/server ibrido e rotte accidentali; risultato HTTP non ancora provato | Spostare soli componenti pagina fuori dalla directory riservata oppure configurare adapter; verificare build e routing senza riscrittura |
| D13 / P1 / documentazione errata | `database/OPERATIONS.md` elenca solo 001–012; README e DEPLOYMENT dicono assenti funzioni già presenti; documento ambiente fermo a sette migrazioni | Setup nuovo incompleto, stato operativo fuorviante | Aggiornare guida installazione, elenco completo migrazioni/test, distinguere registri storici da stato corrente |
| D14 / P2 / bug casi limite | `validation.ts`: NaN/frazioni partecipanti non rifiutati; date JavaScript normalizzabili; `trips.ts` usa fuso browser mentre presentazione forza Roma | Input incoerenti e possibili orari inattesi fuori Italia; il DB può respingere tardivamente | Rafforzare validazione numerica; scelta esplicita sul fuso delle uscite prima di cambiare semantica |
| D15 / P2 / rischio diagnostica | Worker email salva/logga messaggio provider arbitrario; caricamenti secondari del dettaglio ignorano errori; signOut non gestisce fallimento | Dati provider potenzialmente nei log e guasti difficili da capire; UI può restare bloccata | Errori strutturati redatti, timeout e gestione retry; test mirati, senza introdurre telemetria esterna automaticamente |
| D17 / P1 / bug di routing ricostruito dal codice | `src/App.tsx` non dichiarava `/u/:tripId`; login/profilo usano `navigate(returnTo)` e il wildcard rinviava alla home | Ritorno dal percorso pubblico perso nella SPA, anche con returnTo corretto | Ponte verso la pagina server con navigazione del documento; verificare poi il percorso nel browser |
| D18 / P1 / test obsoleto dimostrato | `database/tests/019_security_gate_contract.sql` pretendeva 15 SECURITY DEFINER e vietava anche `format()` per semplici chiavi; metadati attuali: 26 firme | Gate fallisce prima dei test RLS e non inventaria le aggiunte recenti | Whitelist esatta delle firme, una sola RPC anonima, conservare controllo search_path e assenza EXECUTE dinamico; verificabile READ ONLY |
| D19 / P1 / rischio di stato UI da riprodurre | `src/views/TripDetailPage.tsx`, `EditTripPage.tsx`, `TripFeedbackPage.tsx`: al cambio parametro i caricamenti non azzerano sempre entità, valori ed errori | Navigazione tra due uscite con errore di rete può mantenere dati/azioni precedenti; nessuna riproduzione browser disponibile | Test con due ID e risposta tardiva/fallita, poi reset/remount mirato e cancellazione dei caricamenti; resta proposta separata |

Preferenze di stile: file `trips.ts` e pagine grandi, ripetizione etichette stato e CSS stratificato. Da sole non giustificano una riscrittura, una libreria stato globale o nuove dipendenze. Gli advisor performance riportano 15 indici inutilizzati: con pochissimi dati non è evidenza che vadano rimossi.

## Sicurezza e integrità: esiti e limiti

Separazione spot pubblico/privato, policy per utente, RPC admin con controllo server e ruoli nel DB sono scelte coerenti. Non sono stati trovati usi di user_metadata per attribuire il ruolo admin. Le chiavi server sono lette da env/Vault nei worker e il client usa configurazione pubblica; `.env.local` è ignorato. Non vengono copiati valori di segreti nel rapporto.

Il Security Advisor attuale riporta anche `pg_net` in public, una RPC SECURITY DEFINER anon intenzionale (`get_public_fishing_trip`), 25 funzioni callable da authenticated e quattro tabelle RLS senza policy. Questi avvisi non dimostrano da soli vulnerabilità: le tabelle sono revocate ai client e le funzioni vanno controllate per ownership/stato/input. Il gate storico non copre automaticamente le aggiunte successive. I lock di decisione/conferma e i vincoli di unicità sono presenti nel codice SQL; la concorrenza non è stata riprodotta in questo ambiente.

## Limiti dell'ambiente e requisiti mancanti

- Node 25.1.0 e npm 11.6.2 disponibili; dipendenze già installate. Manca psql e Deno. Docker CLI presente, daemon Linux non avviato. Nessuna infrastruttura avviata/modificata per aggirare il limite.
- Browser integrato: localhost in timeout; controllo browser Windows fermato dallo strumento perché non riesce a determinare l'URL con sufficiente affidabilità. Nessun collaudo visivo/mobile dichiarato. CSS contiene breakpoint, focus e reduced-motion: è evidenza statica, non verifica su telefono.
- Prima richiesta `npm audit` fallita per DNS nel sandbox. L'assenza di un risultato non significa assenza di vulnerabilità.
- Non verificati: impostazioni SMTP/Auth, segreti effettivi dei provider, DNS/HTTPS correnti, recapito email/push, deep-link completo, dispositivi reali, backup/ripristino e capacità di carico.
- Da decidere/documentare: fuso dell'uscita per utenti fuori Italia, ritiro dopo accettazione/conferma e annullamento dopo conferma, reperibilità/supporto, conservazione dati/log/backup e gestione account su dispositivo condiviso. Esistono stati SQL senza una corrispondente azione UI: non si assume che ogni transizione sia un requisito della Beta.
- Revisione professionale privacy/termini e decisioni su analytics restano separate dal lavoro sul codice; nessun parere legale è attestato.

## Interventi ordinati e dipendenze

1. Salvare questa baseline; correggere errori client, storage, link incoerenti e validazioni riproducibili con test locali.
2. Proteggere il confine endpoint push con unit test; mantenere modifiche solo locali e fare prova provider in staging prima del rilascio.
3. Riparare sorgente migrazione 009 e documentare bootstrap completo; replay in Supabase isolato con tutti i contratti prima di fidarsi di un'installazione nuova.
4. Allineare il percorso pubblico alla Definition of Done e verificare gli errori di accesso; evitare ampliamenti delle policy sui dati privati.
5. Allestire ambiente staging isolato; verificare D07/D08, matrice RLS, concorrenza posti, recupero password e ritiro/annullamento secondo decisione di prodotto. Aggiungere un controllo CI riproducibile.
6. Collaudare landing → link condiviso → registrazione → email → profilo → richiesta → accettazione → conferma → spot → feedback con due account di prova e su iOS/Android. Verificare recapito esterno e preview.
7. Decidere leaked-password protection, backup/ripristino e supporto; verificare privacy/termini. Poi valutare rilascio controllato con revisione distinta delle modifiche.
8. Misurare uscite reali e ritorno; soltanto dopo valutare P1 di prodotto. Nessuna percentuale di completamento stimata.

## Registro finale degli interventi

### Evidenza aggiuntiva prima dell'aggiornamento dipendenze

`npm audit`, dopo autorizzazione esplicita dell'utente alla trasmissione dei metadati al registro npm, ha rilevato 18 pacchetti segnalati: 2 critical, 11 high, 4 moderate, 1 low. Non sono 18 exploit dimostrati nell'app. Le dipendenze dirette `next@16.3.0` e `react-server-dom-webpack@19.2.6` rientrano in advisory critici. Quest'ultimo è usato dal build/runtime RSC anche se dichiarato devDependency: il solo filtro `--omit=dev` sottostima l'esposizione del bundle.

**D16 / P0 prima di un nuovo rilascio / vulnerabilità note nelle versioni installate**: `web-app/package.json`, lockfile e ambiente RSC. L'advisory [React RSC](https://github.com/advisories/GHSA-xqc2-xf4c-x3h3) indica `19.2.9` come prima patch sicura della linea 19.2; gli advisory [Next Windows](https://github.com/advisories/GHSA-p293-qw3h-jr36) e [Next use cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr) hanno prerequisiti differenti. L'app usa vinext e non tutte le superfici Next: non si attesta sfruttabilità del deploy. Intervento circoscritto previsto: allineare React/ReactDOM/RSC alla patch 19.2.9 e Next alla versione corretta indicata dal registro, mantenendo vinext e verificando peer dependency, test e build. Le vulnerabilità residue della toolchain e l'eventuale salto maggiore vinext richiedono revisione separata.

### Modifiche concluse e verifiche

| Intervento | Esito e prova | Limite |
| --- | --- | --- |
| D01: apici migrazione 009 | Riparati i letterali; nuovo guardrail Python falliva prima e passa dopo | Non eseguito un replay SQL completo; nessuna migrazione applicata al remoto |
| D02: errori Supabase | Supportati plain object, Error e stringhe; traduzioni statiche per sessione, profilo e capienza; dettagli sconosciuti restano redatti. Test degli oggetti falliva prima, passa dopo | Non è una telemetria né una traduzione di tutti i possibili errori |
| D03: storage returnTo | Protette letture/scritture/rimozioni; SecurityError e quota esaurita riprodotti prima della correzione e gestiti dopo | Senza storage il ritorno persistente tra browser resta impossibile; il parametro URL continua a essere utilizzabile |
| D04: endpoint push | `push-delivery.js` consente solo destinazioni dei provider supportati e imposta timeout 10 s. Test provano invio per i quattro provider e zero chiamate per 14 endpoint vietati, inclusi loopback, metadata IP, credenziali e hostname ingannevoli. Endpoint non ammesso diventa errore definitivo nel worker | Nessun invio reale o deploy; manca Deno per type-check dell'entrypoint. La RPC di registrazione resta permissiva e va allineata in staging. Un browser con provider diverso richiede estensione esplicita della lista |
| D05/D17: inviti e ritorno pubblico | Link pre-conferma coerenti in notifiche, home, storico, email e push; ritorno `/u` gestito da `PublicTripRedirect`. I link di conferma continuano ad aprire i dettagli. Test di destinazione verdi | Navigazione JavaScript completa e ritorno dopo email da collaudare nel browser |
| D06: pagina pubblica | Messaggio opzionale max 300, normalizzatore condiviso, errori di query gestiti, account disabilitato distinto, nessun successo su risposta RPC vuota. Stato/collegamento ai dettagli visibile anche per partecipanti confermati e pagina chiusa alle nuove richieste | Test di stato/RPC e compilazione; nessun test browser del form o dell'autenticazione reale |
| D11: firme foto | Cache per singola ricerca, senza persistenza fra utenti. Nel caso misurato: **3 chiamate prima, 2 dopo**, con stessi avatar, fallback per foto negata e stato partecipazione. Test inizialmente rosso e poi verde | Nessuna misura di latenza reale; restano caricamento di 50 risultati per la home e RPC summary per uscita |
| D12: directory riservata | 17 file spostati da `src/pages` a `src/views`, import e validatore aggiornati. Build genera solo le due route App Router, senza il server Pages Router aggiuntivo (78 moduli nella baseline) | I D/A mostrati da Git sono spostamenti non ancora in staging, non perdita dei file. Nessuna riscrittura delle pagine |
| D13: documentazione | README, deployment, bootstrap database e registri storici riallineati; elenco SQL include tutte le migrazioni e i contratti, con arresto sugli errori | La procedura descritta resta da eseguire da zero su un ambiente isolato |
| D14: capienza | Rifiutati NaN, infinito e frazioni prima della chiamata DB; test rosso prima e verde dopo | Semantica date e fuso non cambiata |
| D16: dipendenze | React/ReactDOM/RSC `19.2.9`, Next `16.4.6`, Vite `8.3.8`, Vitest `4.1.12`, lockfile aggiornato. Nessuna nuova dipendenza diretta; installazione senza script lifecycle | Nessun aggiornamento maggiore di vinext o cambio runtime; serve collaudo staging prima del rilascio |
| D18: security gate | Fallimento riprodotto con metadati READ ONLY: 26 funzioni contro 15. Corretto inventario per firme esatte e unicità della RPC anonima. Parte iniziale del test 019 ora passa sul remoto in READ ONLY | Le fixture e i test RLS del seguito non sono stati eseguiti; la whitelist non certifica correttezza di ogni corpo funzione |

L'adattatore server RSC viene usato a runtime pur essendo parte della toolchain: le patch critiche sono state applicate localmente, ma **non sono state pubblicate**. Non si deduce da questo audit quale versione delle dipendenze sia effettivamente nel deploy attivo.

### Verifiche finali effettivamente eseguite

- **104 test Vitest verdi in 21 file**, rispetto agli 88 iniziali. Comprendono stati pubblici, errori query/RPC, messaggi, storage negato, capienza e deduplica foto. La suite non è E2E.
- **12 test Node verdi** per contenuti email/push e confine di invio, rispetto ai 9 iniziali. Nessuna notifica inviata.
- **TypeScript strict e build vinext di produzione verdi** con dipendenze aggiornate. Rimane un warning di timing/debugName del bundler generato dall'adattatore, non un errore di build. Corretto anche l'import senza estensione segnalato dal nuovo Vite.
- **Due validatori Python verdi**; la nuova regressione degli apici è inclusa. Restano controlli statici, non parsing completo PostgreSQL.
- **Contratti SQL 007, 014 e 022 verdi sul database remoto, forzati READ ONLY**, e **solo sezione metadati di 019 verde** con lo stesso vincolo. Nessuna fixture del test 019 inviata al database. Il resto della suite SQL e il replay delle migrazioni non sono dichiarati superati.
- **Data API anonima reale** con configurazione pubblica esistente: tecniche 200/13 righe; `app_users`, `trip_private_details`, `get_push_worker_config` 401; RPC pubblica 200 con DTO di 18 campi senza coordinate private, contatti, partecipanti o identità organizzatore. `process-push-outbox` con la sola azione di lettura `config` risponde 200; nessuna elaborazione della coda invocata.
- **Smoke HTTP della build locale**: `/`, `/accedi`, `/registrati`, `/profilo`, `/push-sw.js`, `/manifest.json` rispondono 200 con tipo contenuto previsto. UUID invalido mostra stato non disponibile; un'uscita già pubblica rende dati pubblici sul server senza i nomi dei campi privati nell'HTML. Sono letture, non test visivi o test della protezione di qualunque payload possibile. Server di collaudo arrestati a fine verifica.
- **Scansione mirata dei file tracciati**: 191 file testuali esistenti dopo gli spostamenti, nessun pattern di chiave segreta Supabase, chiave AWS, chiave privata PEM/OpenSSH o JWT service_role trovato. `.env.local` contiene soltanto i due nomi di configurazione pubblica previsti. Non è una scansione completa della storia Git o dei file personali non tracciati.
- **`git diff --check` verde**; le segnalazioni LF/CRLF sono avvisi del checkout Windows. Le modifiche iniziali non tracciate sono state preservate. Nessun commit, push o deploy eseguito.

L'installazione npm è terminata con successo; ha segnalato EPERM nella pulizia di un vecchio binding nativo mentre erano attivi processi di collaudo. `npm ls --depth=0` mostra anche un pacchetto opzionale `@emnapi/wasi-threads` extraneous nell'ambiente locale, senza peer invalidi nelle dipendenze dirette. Non è stato cancellato manualmente. Il prossimo ambiente deve essere installato dal lockfile con `npm ci`.

### Audit dipendenze prima/dopo

Report integrali: [prima](review-2026-11-14/audit-dependencies.json), [dopo](review-2026-11-14/audit-dependencies-after.json).

| Severità npm | Prima | Dopo |
| --- | ---: | ---: |
| Critical | 2 | 0 |
| High | 11 | 9 |
| Moderate | 4 | 2 |
| Low | 1 | 1 |
| Totale pacchetti segnalati | 18 | 12 |

Restano segnalati `@cloudflare/vite-plugin`, `wrangler`, `miniflare`, `ws`, `undici`, `esbuild`, `fast-uri`, `sharp`, `vinext`, `image-size`, `@vercel/og`, `satori`. Le famiglie Cloudflare riguardano soprattutto tooling/emulazione; vinext porta anche dipendenze image/OG da valutare rispetto agli endpoint realmente esposti. L'app non usa componenti Next Image o ImageResponse, ma questo da solo non prova irraggiungibilità degli handler del framework. Nessuno sfruttamento è stato tentato.

Non è stato usato `npm audit fix --force`: il rimedio proposto dal registro per vinext comporta un salto da `0.0.50` a `1.4.5`, che tocca l'adattatore centrale Sites/Cloudflare e richiede un lavoro di compatibilità separato. Anche l'aggiornamento della famiglia Cloudflare va provato su dev e staging, includendo avvio worker, binding e deployment package. **Gli high residui richiedono una decisione tecnica prima di un nuovo rilascio; 0 critical non significa audit pulito.**

### Priorità residue e prossimo passo concreto

1. **Ambiente isolato e sicurezza prima del rilascio**: installazione `npm ci`, replay di tutte le migrazioni, contratti SQL completi; test negativi di D07 (account disabilitato/gruppo) e D08 (logout/cambio account/coda push), chiusura o motivazione degli advisory high residui. Nessuna modifica di questi confini sul database attivo senza collaudo.
2. **Collaudo del ciclo completo con due utenti**: invito o link condiviso → onboarding/email → richiesta con messaggio → decisione → conferma → dettagli riservati → feedback; includere rete assente, risposta tardiva, zero posti e cambio ID tra uscite (D19). Verificare su iPhone e Android; autorizzare invii solo con account e destinatari di prova.
3. **Operatività**: verificare recapito Resend/Auth SMTP, push con destinatari controllati, template e redirect Auth, protezione password compromesse, backup/ripristino, tempi di conservazione e supporto. Decidere ritiro/annullamento dopo conferma e semantica del fuso. Questi punti non si risolvono con una riscrittura frontend.
4. **Rilascio controllato separato**: revisione diff e pacchetto, inclusi nuovi file e rinominati; solo dopo approvazione pubblicare app e worker. Le correzioni di questa revisione non cambiano oggi il servizio pubblico.
5. **Validazione sul campo**: misurare le prime 5 uscite reali prima di ranking, reputation, alert e SEO territoriale. Ottimizzare altre query solo con misure rappresentative.

Il prossimo lavoro concreto consigliato è il punto 1, in una Supabase di collaudo con dati sintetici e provider disabilitati, senza clonare automaticamente dati personali della Beta.

### Fonti tecniche consultate

Oltre ai sorgenti e metadati del progetto: [changelog Supabase](https://supabase.com/changelog.md), [advisory React RSC](https://github.com/advisories/GHSA-xqc2-xf4c-x3h3), [Next Windows](https://github.com/advisories/GHSA-p293-qw3h-jr36), [Next use cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr). Per la lista push: [Mozilla Autopush](https://mozilla-services.github.io/autopush-rs/), [Apple Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [Microsoft WNS](https://learn.microsoft.com/en-us/windows/apps/develop/notifications/push-notifications/firewall-allowlist-config), [Chrome Push](https://developer.chrome.google.cn/blog/push-notifications-on-the-open-web?hl=en). La lista ammette solo quei provider; eventuali nuovi endpoint richiedono verifica e test.
