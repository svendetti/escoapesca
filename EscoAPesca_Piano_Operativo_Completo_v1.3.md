# EscoAPesca — Piano operativo completo v1.3

**Ultimo aggiornamento:** 31 agosto 2026
**Stato:** Beta P0 operativa end-to-end; flusso PWA mobile `fd31852` pubblicato in Sites v46 e GitHub allineato; milestone storica 1/5 uscite reali validate; dataset operativo corrente azzerato per nuovi test
**Ambito iniziale:** Regione Lazio  
**Visione:** piattaforma scalabile progressivamente in tutte le regioni italiane  
**Payoff:** Trova qualcuno con cui andare a pesca.

## 1. Executive summary

EscoAPesca vuole risolvere un problema concreto: molti pescatori vorrebbero uscire più spesso, ma non trovano persone disponibili e compatibili per zona, tecnica, livello e orari.

Il prodotto non nasce come mappa pubblica di spot né come social generico di fotografie. Il suo valore aggiunto è **aiutare persone compatibili a organizzare uscite reali**, proteggendo gli spot e riducendo il peso organizzativo.

Il progetto è concepito per tutta Italia, ma la validazione parte esclusivamente dal Lazio per evitare una community dispersa e misurare la capacità di creare massa critica locale. La Beta web è ora operativa sul dominio `app.escoapesca.it`: il lavoro prioritario non è aggiungere macro-funzionalità, ma dimostrare che il flusso completo genera uscite effettivamente svolte tra pescatori che non si conoscevano prima.

## 2. Decisioni strategiche confermate

| Tema | Decisione |
|---|---|
| Territorio | Brand nazionale e architettura scalabile; lancio e operatività iniziale solo Lazio. |
| Problema principale | Difficoltà nel trovare compagni affidabili e compatibili con cui pescare. |
| Promessa | Match per zona, ambiente, tecnica, livello e disponibilità. |
| Spot | Zona indicativa pubblica; posizione precisa condivisa solo tra partecipanti accettati. |
| Validazione | Beta web operativa, acquisizione controllata, supporto concierge quando utile e misurazione delle uscite reali. |
| Tipi di uscita | Uscite organizzate e “uscite facili/libere” a basso impegno. |
| Gamification | Punti e livelli previsti, ma premi fisici rinviati dopo la validazione economica. |
| Monetizzazione | Non prioritaria nella prima fase; prima si valida il bisogno e la frequenza d'uso. |
| Accesso beta | Registrazione e profilo pescatore; nessuna garanzia automatica di trovare compagni o svolgere un'uscita. |

## 3. Posizionamento

**One-liner:** EscoAPesca è l'app per trovare compagni di pesca compatibili vicino a te, organizzare uscite e proteggere i tuoi spot.

**Cosa deve comunicare:**

- non sei obbligato a pescare da solo;
- trovi persone compatibili, non un gruppo generico e dispersivo;
- puoi aderire a un'uscita semplice senza diventare organizzatore professionale;
- lo spot preciso non viene pubblicato;
- fiducia, sicurezza e reputazione crescono dopo le uscite reali.

**Cosa non è:**

- una mappa pubblica di spot;
- un sostituto delle fonti ufficiali su licenze e regolamenti;
- un social basato solo su foto e like;
- un servizio che garantisce automaticamente compagni o uscite.

## 4. Valore aggiunto forte

Il prodotto sarà utile solo se renderà più facile arrivare all'azione reale. Le funzioni da difendere sono:

1. **Compatibilità concreta:** zona, tecnica, livello, disponibilità, ambiente e tipo di uscita.
2. **Protezione degli spot:** nessun punto preciso visibile pubblicamente.
3. **Uscite facili:** proposta rapida con pochi campi e responsabilità limitata dell'autore.
4. **Fiducia progressiva:** profili, feedback post-uscita, segnalazioni e blocco.
5. **Riduzione degli attriti:** richiesta con messaggio breve, accettazione, conferma, dettagli privati, notifiche e promemoria nello stesso flusso.
6. **Densità locale:** attivazione per aree con un numero sufficiente di persone compatibili.

## 5. Utente iniziale e ipotesi da validare

Il primo pubblico è composto da pescatori maggiorenni nel Lazio, sia di acqua salata sia di acqua dolce, che:

- escono da soli più spesso di quanto vorrebbero;
- hanno difficoltà a coordinarsi nei gruppi generalisti;
- desiderano imparare o condividere esperienza;
- vogliono dividere spostamenti e costi;
- non vogliono pubblicare gli spot;
- sono disponibili a partecipare a una beta e lasciare feedback.

**Ipotesi critica:** un numero significativo di candidati non si limiterà a lasciare un contatto, ma accetterà una proposta concreta e parteciperà a un'uscita.

## 6. Tassonomia MVP

### Ambiente

- Acqua salata
- Acqua dolce
- Entrambe

### Tecniche iniziali

- Surfcasting
- Spinning
- Bolognese
- Feeder
- Carpfishing
- Pesca a fondo
- Altro

### Tipi di luogo

- Spiaggia
- Scogliera
- Porto, dove consentito
- Fiume
- Lago
- Canale
- Laghetto sportivo
- Barca

### Livello

- Principiante
- Intermedio
- Esperto

## 7. Tipologie di uscita

### Uscita facile/libera — prioritaria per la beta

È una proposta informale: “Io vado qui, in questa fascia oraria; se sei compatibile puoi unirti”. Richiede pochi dati e non attribuisce all'autore responsabilità da guida, istruttore o organizzatore professionale.

Campi minimi:

- zona approssimativa;
- data e fascia oraria;
- ambiente e tecnica;
- livello consigliato;
- numero indicativo di posti;
- eventuale condivisione del viaggio o dei costi;
- note essenziali.

### Uscita organizzata — disponibile nella Beta

Prevede maggiori dettagli, gestione delle richieste, partecipanti accettati/confermati e condivisione riservata delle informazioni d'incontro. Deve restare distinta dall'attività professionale di guida o organizzazione commerciale.

## 8. Stato operativo al 30 agosto 2026

### Completato

- posizionamento, strategia Lazio-first e North Star Metric definiti;
- landing pubblica, Privacy, Termini e copy dell'app allineati allo stato reale della Beta;
- applicazione web autenticata disponibile su `https://app.escoapesca.it`;
- registrazione, conferma email, profilo pescatore e recupero sicuro del percorso iniziale;
- creazione, ricerca e gestione delle uscite;
- pagina pubblica stabile `/u/{tripId}` con DTO pubblico limitato e metadata social;
- condivisione WhatsApp e copia link senza dati privati;
- richieste di partecipazione con messaggio breve e mini-profilo autorizzato;
- accettazione/rifiuto, conferma dell'uscita e dettagli d'incontro riservati;
- notifiche in-app, email transazionali, Web Push su dispositivi compatibili e deep-link autenticati;
- invito diretto a un utente EscoAPesca tramite ricerca per nome/zona, notifica in-app e push;
- richiesta feedback post-uscita e massimo un reminder schedulato server-side;
- home autenticata orientata alla prossima azione;
- dashboard Admin con metriche operative e moderazione;
- audit Supabase, contratti RLS, hardening delle RPC e Security Advisor;
- dominio Resend `mail.escoapesca.it` verificato;
- worker email e Cron attivi; prime quattro email transazionali ricevute realmente;
- build di produzione, test frontend, test worker e contratti SQL verdi alla chiusura P0;
- salvataggio e visibilità dei dettagli privati verificati manualmente in produzione dopo il fix `81de696`;
- core loop verificato in produzione con due account: invito WhatsApp, richiesta, accettazione, conferma definitiva dell'organizzatore, dettagli privati, notifiche, email e feedback;
- stato del partecipante chiarito esplicitamente dopo l'accettazione: l'uscita resta in attesa della conferma definitiva dell'organizzatore;
- deep-link WhatsApp ed email verificati attraverso login, con ritorno all'uscita di origine;
- conferma email resa esplicita e resistente al prefetch tramite pagina intermedia `/conferma-email`; template Supabase aggiornato manualmente e test considerato positivo;
- accesso dalla landing corretto: l'utente già autenticato con profilo completo arriva alla home operativa, non al profilo;
- form uscita semplificato: titolo automatico con codice pubblico univoco, titolo personalizzato opzionale, descrizione/attrezzatura non obbligatorie, fine flessibile o su più giorni;
- selettore ricercabile delle località costiere del Lazio per le uscite in mare, mantenendo provincia e zona generica per gli altri ambienti;
- label opzionali allineate nel profilo e negli altri form interessati;
- dettaglio uscita rifinito: condivisione nascosta dopo la fine e prompt feedback nascosto dopo l'invio;
- Admin rifinito con lista utenti compatta/espandibile, reset dei dati operativi che preserva gli utenti ed eliminazione definitiva riservata agli utenti già disattivati;
- tutti gli account correnti riclassificati come reali: `is_test = false` per 5 utenti; il default per i nuovi account resta `false`;
- storico personale delle uscite con possibilità di nascondere e ripristinare record conclusi; moderazione Admin con oscuramento/ripristino e motivazione;
- condivisione immediata dopo la creazione con azioni distinte: WhatsApp, copia link e invito a un utente EscoAPesca;
- azione di invito diretto mantenuta visibile dopo l'inizio, ma disabilitata con spiegazione perché le richieste si chiudono all'orario di partenza;
- prima uscita reale validata da feedback di entrambe le parti: milestone storica **1/5**; il reset operativo successivo ha rimosso i record dal database senza annullare l'evidenza di validazione raccolta;
- 80 test frontend e 9 test complessivi dei worker email/push verdi; build di produzione riuscita il 30 agosto 2026;
- codice applicativo, GitHub `main` e produzione Sites v45 allineati alla baseline applicativa `da1a22a` prima del presente aggiornamento documentale.

### Da completare nella validazione controllata

- osservare organicamente il primo `feedback_reminder` P0.9: il 29 agosto risultano tre `feedback_requested` inviati e nessun reminder ancora maturato;
- completare un giro sistematico degli stati negativi e dei permessi, inclusa la perdita di accesso ai dettagli privati dopo cancellazione;
- ripetere il percorso pagina pubblica → nuova registrazione → conferma email → profilo → uscita con un nuovo account reale, senza considerarlo bloccante per l'acquisizione già avviata;
- controllare quotidianamente funnel, coda email, Cron ed errori operativi;
- riesaminare i warning correnti del Security Advisor sulle RPC `SECURITY DEFINER` e su `pg_net`, mantenendo come prova i controlli interni e i test negativi già presenti;
- riconciliare la migration locale dell'eliminazione utente con la cronologia migrations remota: gli oggetti sono presenti e operativi, ma la versione non compare nella lista remota;
- portare utenti reali nella Beta concentrandoli per provincia, tecnica e disponibilità;
- raggiungere altre **4 uscite reali validate** per completare la milestone **5/5**;
- raccogliere interviste e feedback e identificare il collo di bottiglia prioritario prima di scegliere qualsiasi sviluppo P1.

### Non ancora validato

- densità sufficiente per provincia/tecnica nel Lazio;
- costo e ripetibilità dell'acquisizione utenti;
- conversione profilo → prima richiesta o prima uscita creata su un campione reale significativo;
- capacità del core loop di ripetersi oltre la prima uscita validata;
- fiducia tra sconosciuti, qualità delle uscite e frequenza di ritorno su un campione sufficiente;
- disponibilità futura a pagare, che resta fuori dalla priorità immediata.

**Valutazione attuale:** il P0 tecnico e il core loop sono utilizzabili end-to-end e la prima uscita reale è stata validata. Il progetto non è ancora validato: servono traffico qualificato, altre 4 uscite reali validate, osservazione del ritorno all'uso e interviste sufficienti a identificare il collo di bottiglia principale.

## 9. Infrastruttura e asset attuali

| Elemento | Stato | Riferimento |
|---|---|---|
| Landing pubblica | Online | `https://www.escoapesca.it/` |
| App Beta | Online | `https://app.escoapesca.it/` |
| Hosting app | Attivo | OpenAI Sites / Cloudflare, progetto pubblico `escoapesca-beta`, versione 45 |
| Repository | Attivo e allineato | GitHub `main`; baseline applicativa pubblicata `da1a22a4fd92733bfc92e91bb18c1b6d1cc1d494` |
| Backend | Attivo | Supabase, progetto `EscoAPesca Beta`, regione `eu-west-1` |
| Database e Auth | Attivi | PostgreSQL 17, Auth, RLS, RPC e contratti SQL |
| Storage profili | Attivo | Bucket privato con accessi limitati dalle policy |
| Email transazionali | Attive | Resend + Edge Function `process-email-outbox` v5 + Cron ogni minuto |
| Web Push | Attivo tecnicamente | Service worker + Edge Function `process-push-outbox` v3 + Cron ogni minuto; ricezione/suono dipendono da permesso, browser e impostazioni del dispositivo |
| Feedback scheduler | Attivo | Cron `escoapesca-enqueue-feedback-prompts` ogni 15 minuti |
| Eliminazione utente Admin | Attiva | Edge Function `admin-delete-user` v1 + RPC solo `service_role`; solo target disattivati |
| Dominio email | Verificato | `mail.escoapesca.it` |
| Modulo Tally storico | Disponibile | Canale legacy/ausiliario, non più flusso principale del prodotto |
| Instagram | Creato | `@escoapesca` |
| Kit social | Pronto | Cartelle `social-launch-kit` e `social-calendar` |

Stato dati verificato direttamente il 30 agosto 2026 alle 19:26 UTC, dopo il reset operativo Admin:

- 5 utenti registrati, attivi e con profilo completo;
- 0 utenti marcati come test;
- 0 uscite correnti, 0 partecipazioni, 0 inviti diretti e 0 uscite scopribili;
- 0 feedback, 0 notifiche e 0 record nelle outbox correnti;
- `beta_real_fishing_trips = 0` nel dataset corrente perché il reset ha eliminato i record operativi;
- milestone di prodotto storica conservata a **1/5**, basata sulla precedente uscita validata da entrambe le parti;
- prima del reset erano state rilevate 9 email transazionali con stato `sent`.

## 10. Flusso di acquisizione e validazione

1. Una persona vede un contenuto, una landing o un link WhatsApp a una specifica uscita.
2. Apre la landing o la pagina pubblica dell'uscita.
3. Si registra, conferma l'email e completa il profilo pescatore.
4. Torna automaticamente all'uscita di origine oppure cerca/propone un'uscita.
5. Invia una richiesta con un breve messaggio.
6. L'organizzatore valuta il mini-profilo e accetta o rifiuta.
7. L'organizzatore conferma il gruppo e inserisce i dettagli privati.
8. I partecipanti autorizzati ricevono notifiche ed email e vedono i dettagli dell'incontro.
9. Dopo `ends_at`, entrambe le parti ricevono la richiesta feedback e al massimo un reminder.
10. Le evidenze di entrambe le parti alimentano la metrica delle uscite reali validate.

## 11. Modulo beta storico

Campi previsti:

- nome;
- email;
- WhatsApp facoltativo;
- regione, provincia e comune/zona;
- ambiente;
- tecniche;
- livello;
- disponibilità;
- obiettivo: compagni, imparare, dividere spese, creare uscite;
- consenso privacy.

Il modulo Tally resta un asset storico o un canale ausiliario per campagne specifiche. Il percorso principale della Beta è ora la registrazione diretta nell'app; le candidature Tally non devono essere mischiate automaticamente alle metriche applicative senza una procedura esplicita di importazione e deduplicazione.

## 12. Strategia social iniziale

### Obiettivo

Ottenere candidature qualificate nel Lazio, non accumulare follower o like non pertinenti.

### Canali prioritari

1. Instagram: credibilità del brand, Reel, post e Stories.
2. TikTok: scoperta organica tramite video verticali brevi.
3. Gruppi Facebook locali: solo dopo aver preparato messaggi non invasivi e rispettando le regole dei gruppi.
4. Contatto diretto con negozi, laghetti, associazioni e micro-creator del Lazio.

### Primo contenuto

- formato: MP4 verticale 1080×1920;
- messaggio: trovare la persona giusta con cui uscire;
- territorio: Lazio;
- CTA: candidatura alla beta su `escoapesca.it`;
- tono: serio, moderno, inclusivo e concreto.

### Tracciamento

Ogni canale deve usare URL con parametri UTM distinti. Dati minimi quotidiani:

- visualizzazioni del contenuto;
- visite al profilo;
- clic sul link;
- aperture del modulo;
- candidature completate;
- costo, se si usa promozione a pagamento;
- provincia e qualità delle candidature.

## 13. KPI della validazione Lazio

### Primo ciclo: 30 giorni dal lancio social

| Metrica | Minimo utile | Segnale forte |
|---|---:|---:|
| Candidature complete e pertinenti | 50 | 150+ |
| Province con almeno 10 candidati | 2 | 4+ |
| Interviste svolte | 10 | 25+ |
| Candidati disponibili a una proposta concreta | 20% | 40%+ |
| Uscite facili proposte | 5 | 15+ |
| Uscite realmente svolte | 2 | 8+ |
| Partecipanti disposti a ripetere | 40% | 65%+ |

Milestone prodotto vincolanti:

- **Milestone 1:** 5 uscite reali validate — avanzamento attuale **1/5**;
- **Milestone 2:** 20 uscite reali validate.

Non iniziare nuove macro-funzionalità per compensare un problema di acquisizione o densità.

### Metriche diagnostiche

- conversione visita landing → candidatura;
- conversione candidato → risposta a una proposta;
- conversione proposta → uscita svolta;
- tempo medio necessario per formare un gruppo;
- percentuale di no-show e cancellazioni;
- problemi di fiducia o sicurezza;
- distribuzione geografica e tecnica.

### Cancellazione delle candidature di prova

Le candidature usate per i test tecnici devono essere eliminate o contrassegnate e sempre escluse dalle metriche di validazione.

## 14. Cancelli decisionali

**GO verso P1:** P0 utilizzabile end-to-end, prime uscite reali, almeno 5 uscite validate e problema prioritario osservato chiaramente nel funnel.

**ITERARE:** arrivano candidature, ma sono troppo disperse o non rispondono alle proposte. Occorre restringere territorio, tecnica o messaggio.

**PIVOT:** il bisogno esiste ma emerge soprattutto per eventi, lezioni, laghetti, car sharing o community già organizzate.

**STOP/FREEZE:** dopo test organici e piccoli test a pagamento ben tracciati arrivano soprattutto like, poche candidature qualificate e nessuna uscita reale.

## 15. Punti di forza

- problema comprensibile e frequente;
- nicchia con identità e passioni forti;
- proposta più concreta di un social generico;
- protezione degli spot come elemento distintivo;
- possibilità di validazione manuale a costo contenuto;
- espansione geografica modulare;
- potenziale rete di partner locali;
- uscite facili che abbassano la barriera all'organizzazione;
- identità visiva e infrastruttura di acquisizione già operative.

## 16. Debolezze

- marketplace locale soggetto al problema di massa critica;
- utenti frammentati per territorio, tecnica, livello e orari;
- fiducia tra sconosciuti non ancora dimostrata;
- rischio di candidature curiose ma inattive;
- necessità di moderazione, supporto e gestione dei conflitti;
- dipendenza iniziale dal lavoro manuale del fondatore;
- difficoltà nel monetizzare prima di creare abitudine e densità;
- premi fisici costosi e facilmente abusabili;
- limiti grafici e tecnici dei servizi esterni incorporati.

## 17. Rischi e contromisure

| Rischio | Impatto | Contromisura iniziale |
|---|---|---|
| Pochi utenti nella stessa zona | Alto | Partire solo dal Lazio e concentrare campagne per provincia/tecnica. |
| Molte lead ma nessuna uscita | Critico | Misurare proposte e presenze reali; contatto umano rapido. |
| Paura di condividere spot | Alto | Zona approssimativa pubblica e punto preciso solo agli accettati. |
| Organizzatore percepito come responsabile | Alto | Uscita facile con linguaggio chiaro: proposta tra pari, non servizio di guida. |
| No-show e cancellazioni | Medio/alto | Conferme, promemoria, regole semplici e reputazione progressiva. |
| Comportamenti scorretti o pericolosi | Alto | Segnala/blocca, regole di condotta, moderazione e gestione incidenti. |
| Minori e sicurezza personale | Alto | Beta iniziale per maggiorenni; raccomandazioni per primi incontri in luoghi pubblici. |
| Regole di pesca variabili | Alto | Disclaimer e rimando continuo a fonti ufficiali e regolamenti locali. |
| Trattamento dati e privacy | Alto | Minimizzazione dei dati, informative chiare, accessi limitati e tempi di conservazione. |
| Dipendenza da social/Sites/Supabase/Resend | Medio | Monitoraggio, export, backup, documentazione dei secret e possibilità di sostituzione per componente. |
| Costi dei premi | Medio/alto | Nessun premio fisico garantito nella beta; prima partner e unit economics. |
| Gamification manipolabile | Medio | Punti solo per azioni verificate, limiti e controlli antifrode. |
| Espansione nazionale prematura | Alto | Aprire una nuova regione solo dopo criteri di densità e processo replicabile. |

## 18. Gamification, punti e premi

La gamification può aumentare partecipazione e ritorno, ma non deve premiare spam, uscite inventate o catture. Nella beta si possono testare badge e livelli simbolici senza promesse economiche.

Azioni potenzialmente premiabili:

- profilo completato;
- partecipazione confermata a un'uscita;
- feedback utile dopo l'uscita;
- affidabilità e assenza di no-show;
- contributi verificati alla community;
- invito di utenti che partecipano realmente.

I premi in attrezzatura entrano in una fase successiva, preferibilmente finanziati da partner. Prima servono regole, budget, soglie, antifrode e verifica degli eventuali adempimenti fiscali/promozionali.

## 19. Supporto concierge alla Beta

L'app è operativa, ma un supporto concierge leggero resta utile per creare densità e osservare gli attriti reali:

1. concentra gli inviti su piccoli cluster per provincia, tecnica e disponibilità;
2. aiuta gli utenti a completare il profilo e pubblicare la prima uscita senza sostituirsi a loro;
3. osserva richieste, rifiuti, cancellazioni e no-show tramite i dati dell'app;
4. raccoglie feedback qualitativo dopo l'uscita;
5. registra soltanto problemi verificati e li confronta con il funnel;
6. interviene manualmente solo per supporto o moderazione, non per far funzionare il percorso normale.

Questo lavoro deve spiegare perché il core loop non si completa, evitando di usare nuove funzionalità per mascherare un problema di distribuzione o densità.

## 20. App Beta P0 — operativa

Funzioni minime:

- registrazione, conferma email e profilo pescatore;
- creazione e gestione delle uscite;
- ricerca e filtri;
- pagina pubblica stabile e condivisione WhatsApp/link;
- condivisione immediata dopo la creazione e invito diretto a utenti iscritti;
- richiesta di partecipazione con messaggio breve;
- mini-profilo autorizzato del richiedente;
- accettazione/rifiuto e conferma dell'uscita;
- zona pubblica separata da punto e coordinate riservati;
- notifiche in-app, email transazionali e Web Push;
- feedback post-uscita e reminder idempotente;
- home operativa personale;
- pannello Admin con metriche e moderazione essenziale;
- reset Admin dei soli dati operativi, preservando account e profili;
- eliminazione definitiva Admin di un utente soltanto dopo disattivazione, conferma testuale e controlli server-side;
- archivio personale reversibile delle uscite concluse e oscuramento/ripristino Admin.

La chat completa non esiste ed è fuori scope. Restano esclusi: marketplace attrezzatura, mappe spot pubbliche, classifiche complesse, premi fisici automatici, feed social, AI e funzioni nazionali prive di densità locale.

## 21. Modello dati minimo

- `auth.users` per identità e sessioni;
- `fisher_profiles` per il profilo pescatore;
- `fishing_trips` per le uscite;
- `trip_participants` per richieste, messaggio e stato di partecipazione;
- `trip_invitations` per gli inviti diretti tra utenti iscritti;
- `trip_private_details` per punto, coordinate e note riservati;
- `trip_feedback` per evidenze post-uscita;
- `notifications` ed eventi applicativi;
- `email_outbox` per il delivery transazionale idempotente;
- `push_subscriptions` e `push_outbox` per Web Push idempotente;
- `trip_history_preferences` per nascondere/ripristinare elementi nello storico personale;
- azioni e metriche amministrative.

Regione, provincia e comune non devono essere inseriti nel codice come valori specifici del Lazio: devono provenire da dati territoriali configurabili, così l'espansione nazionale non richiederà una riscrittura.

## 22. Architettura tecnica attuale

- frontend/app: React + React Router;
- wrapper/runtime: Vinext/Vite con App Router wrapper;
- hosting app: OpenAI Sites su runtime Cloudflare;
- backend gestito: Supabase;
- database: PostgreSQL 17 con migrazioni forward-only;
- autenticazione: Supabase Auth;
- autorizzazione: RLS, grant minimi e RPC controllate;
- storage: Supabase Storage con bucket foto privato;
- processi server-side: Supabase Edge Functions, Cron, `pg_net` e Vault;
- email transazionali: Resend tramite outbox separata dagli eventi applicativi;
- notifiche esterne: Web Push tramite service worker, VAPID, outbox, Edge Function e Cron;
- pannello operativo: area Admin nella stessa applicazione;
- landing pubblica: `www.escoapesca.it`, mantenuta coerente con l'app.

Non migrare framework, router, hosting o runtime senza una necessità dimostrata e una decisione esplicita.

## 23. Partner e monetizzazione futura

Partner potenziali:

- negozi ed e-commerce di pesca;
- laghetti sportivi;
- guide e istruttori;
- charter e barche;
- associazioni e club;
- organizzatori di gare amatoriali;
- brand di attrezzatura.

Ricavi da valutare solo dopo la prova di utilizzo:

- freemium;
- servizi premium per utenti;
- abbonamenti o visibilità per partner locali;
- affiliazioni;
- eventi e raduni;
- sponsorizzazioni di premi e iniziative.

## 24. Aspetti legali, sicurezza e privacy da verificare

Prima di ampliare la Beta con più utenti reali occorre mantenere verificati:

- informativa privacy e cookie adeguate al flusso reale;
- termini d'uso e regole di condotta;
- distinzione tra piattaforma, proposta tra pari e attività professionale;
- gestione delle segnalazioni e dei dati sensibili;
- politica per minori: nella beta accesso riservato ai maggiorenni;
- disclaimer su licenze, permessi, meteo, sicurezza e regolamenti;
- verifica specifica prima di concorsi, premi o estrazioni.

Testo guida:

> Prima dell'uscita verifica licenza, permessi, condizioni meteo e regolamento locale. EscoAPesca facilita il contatto tra utenti ma non sostituisce fonti ufficiali, autorità, gestori, guide o istruttori.

## 25. Piano immediato

### Oggi / prossime 48 ore

1. non iniziare nuove macro-funzionalità;
2. osservare il reminder feedback quando matura la finestra di circa 48 ore e verificare che sia unico e soppresso per chi ha già risposto;
3. completare il controllo sistematico degli stati negativi e dei permessi;
4. monitorare Admin, metriche, coda email, Cron e log durante l'uso reale;
5. correggere soltanto regressioni concrete con test, build e commit isolato.

### Prima settimana

1. attivare un piccolo gruppo di utenti reali concentrato territorialmente;
2. pubblicare contenuti e link a uscite reali, non messaggi generici;
3. osservare conversione registrazione → profilo → prima azione;
4. intervistare chi abbandona e chi completa il percorso;
5. portare la milestone da 1/5 a 5/5 con feedback di organizzatore e almeno un partecipante.

### Settimane 2–4

1. consolidare e superare 5 uscite reali validate;
2. analizzare il collo di bottiglia principale del funnel;
3. confrontare canali, province, tecniche e tempi di risposta;
4. decidere se iterare il P0 o iniziare il primo P1 applicabile;
5. non iniziare automaticamente P1.1–P1.5 né estendere P1.6 oltre il percorso PWA mobile già approvato, prima del gate.

## 26. Conclusione obiettiva

EscoAPesca dispone ora di una Beta P0 utilizzabile end-to-end, con confini di privacy, notifiche esterne, feedback, controllo operativo e una prima uscita reale validata. La principale incertezza non è più la fattibilità tecnica del flusso, ma la capacità di acquisire abbastanza utenti compatibili e ripetere il risultato.

Il prossimo risultato utile non è una nuova funzione grafica, ma completare le **altre 4 uscite reali validate** necessarie per arrivare a 5/5 tra pescatori che non si conoscevano prima, seguite da evidenza di ritorno all'uso.

## 27. Registro aggiornamenti

- **7 luglio 2026 — v1.0:** impostazione iniziale del progetto.
- **14–16 luglio 2026 — v1.1:** focus Lazio, rischi e contromisure, uscite facili, gamification rinviata, landing, logo, GitHub Pages, dominio e HTTPS, Tally, email, Instagram, TikTok, kit e calendario social, KPI e piano di validazione aggiornati.
- **28 agosto 2026 — v1.2:** Beta web P0 completata e pubblicata; pagina pubblica e condivisione, richieste e conferma, dettagli privati, feedback, home operativa, Admin, security gate, Resend e delivery email end-to-end. P1 sospeso fino a 5 uscite reali validate; protezione password compromesse rinviata perché richiede Supabase Pro.
- **29 agosto 2026 — v1.3:** core loop e dettagli privati verificati in produzione; flusso accettazione/conferma chiarito; deep-link WhatsApp/email e conferma email corretti; reset operativo Admin, lista utenti compatta ed eliminazione sicura degli utenti disattivati; rifiniture form/dettaglio uscita; login autenticato reindirizzato alla home; tutti gli account correnti considerati reali; prima uscita reale validata e milestone a 1/5; produzione allineata a `7da0b2b`.
- **30 agosto 2026 — aggiornamento handoff v1.3:** label opzionali allineate; inviti diretti tra utenti iscritti e Web Push; archivio personale e moderazione uscite; correzione policy di lettura; ricerca utenti e condivisione rese più chiare; località costiere del Lazio; creazione uscita semplificata con titolo/codice automatici e fine flessibile o su più giorni; azione di invito mantenuta visibile ma disabilitata dopo l'inizio; Sites v45 e GitHub allineati alla baseline applicativa `da1a22a`; metriche correnti aggiornate dopo reset operativo.
- **31 agosto 2026 — aggiornamento installazione mobile:** corretta la scheda notifiche; aggiunti manifest, icone e metadati iPhone; introdotto il percorso guidato post-profilo con prompt nativo Android, guida iPhone “Condividi → Aggiungi alla schermata Home” e richiesta del permesso push soltanto dopo l'apertura dalla nuova icona; versione app `0.1.5`, 84 test verdi, commit applicativo `fd31852`; Sites v46 pubblicata con successo e dominio pubblico verificato.

## 28. Avvertenza

Questo documento è una base strategica e operativa e non costituisce consulenza legale, fiscale o normativa. Claim, privacy, concorsi, premi, licenze e responsabilità devono essere verificati con fonti ufficiali aggiornate e professionisti competenti prima della relativa attivazione.

## 29. Handoff operativo e conformità al backlog

Questa sezione è la sintesi vincolante da utilizzare quando il lavoro viene ripreso in una nuova chat. Il backlog completo è incorporato senza modifiche nell'appendice successiva; in caso di dubbio prevalgono lo stato reale del repository e dei servizi, quindi questo handoff, infine il backlog storico.

### Stato Git e produzione verificato

- repository locale: `C:\Users\Devillsit\Desktop\EscoAPesca`;
- repository remoto: `https://github.com/svendetti/escoapesca.git`;
- branch: `main`;
- baseline applicativa pubblicata: `fd31852c78b356a88a3c36aa35b8608b0d9a4d56` (`Guide mobile app installation`);
- GitHub `main` contiene tutto il codice applicativo fino a `fd31852`; i commit successivi che aggiornano questo documento sono documentali;
- produzione app: OpenAI Sites versione **46**, sorgente applicativa `fd31852c78b356a88a3c36aa35b8608b0d9a4d56`;
- URL produzione: `https://app.escoapesca.it`;
- progetto Sites: `appgprj_6a7dd573bb90819187db51158ed8d261`;
- progetto Supabase: `aujrjfiwoduetdftwqzl`, regione `eu-west-1`, piano Free;
- landing, Privacy, Termini, sitemap e asset pubblici sono nella root;
- app Beta in `web-app/`;
- migrazioni e contratti SQL in `database/`;
- Edge Functions in `supabase/functions/`;
- configurazione hosting in `.openai/hosting.json`;
- i file locali non tracciati elencati più avanti devono essere preservati e non inclusi automaticamente.

### Commit applicativi successivi al precedente handoff `7da0b2b`

| Commit | Progresso |
|---|---|
| `821e1ef` | Inviti diretti tra utenti iscritti; notifica in-app; infrastruttura Web Push con subscription, outbox, service worker, VAPID, Edge Function e Cron. |
| `0764345` | Allineamento delle label `opzionale` nel profilo e nei form interessati. |
| `f8de0a9` | Archivio personale reversibile delle uscite e moderazione Admin con oscuramento/ripristino, notifiche e audit. |
| `7134500` | Correzione della policy di lettura delle uscite per eliminare errori nella pagina “Le mie uscite”. |
| `8d79234` | Ricerca utenti e inviti resi più compatti; condivisione WhatsApp/link migliorata e disponibile subito dopo la creazione. |
| `a92c4b1` | Primo selettore delle località costiere del Lazio per la zona delle uscite in mare. |
| `2bfde4b` | Esperienza di creazione resa più fluida: titolo automatico e codice pubblico univoco, titolo personalizzato opzionale, descrizione/attrezzatura non obbligatorie, zona ricercabile, fine flessibile o su più giorni e copy coerente in tutte le viste. |
| `9374e89` | Azioni di invito chiarite: WhatsApp, copia link e invito a un utente EscoAPesca come scelte distinte. |
| `da1a22a` | Il pulsante “Invita un utente EscoAPesca” non sparisce più all'inizio dell'uscita: resta visibile, disabilitato e accompagnato dalla spiegazione della regola. |
| `22cdc9c` | Spaziatura della scheda notifiche corretta; copy per dispositivo chiarito; aggiunti manifest, icone e metadati necessari all'installazione iPhone. |
| `fd31852` | Flusso PWA mobile guidato: prompt nativo Android, istruzioni iPhone, ritorno alla Home dopo il primo profilo, richiesta push dopo apertura standalone, registrazione anticipata del service worker e test dedicati. |

### Progressi funzionali consolidati al 31 agosto

1. **Creazione uscita più veloce**
   - il sistema compone un titolo standard da tecnica e zona;
   - ogni uscita riceve un codice pubblico univoco `EP-...`;
   - il titolo personalizzato resta disponibile ma non è più uno sforzo obbligatorio;
   - descrizione e attrezzatura non sono più campi obbligatori né duplicano informazioni già strutturate;
   - la fine può essere nello stesso giorno, flessibile (“finché ne abbiamo voglia”) o in un giorno successivo, con ora finale opzionale;
   - provincia resta un campo strutturato; per il mare è disponibile una combo ricercabile di località costiere del Lazio, mentre per acqua dolce resta utilizzabile una zona generica coerente con laghi e fiumi.

2. **Condivisione e inviti**
   - subito dopo la creazione sono disponibili `Condividi su WhatsApp`, `Copia link` e `Invita un utente EscoAPesca`;
   - l'invito interno usa ricerca progressiva per nome, comune o zona e non mostra una lista completa ingestibile;
   - l'utente invitato riceve una notifica in-app e, se ha attivato il permesso, una Web Push;
   - WhatsApp e copia link usano la pagina pubblica senza dati privati dei partecipanti o dello spot;
   - il link “Apri pagina pubblica” è una preview di ciò che vede un destinatario senza account; la sua label è ancora oggetto di decisione UX.

3. **Notifiche esterne**
   - `process-email-outbox` v5, `process-push-outbox` v3 e `admin-delete-user` v1 risultano `ACTIVE`;
   - Cron email e push sono attivi ogni minuto; Cron feedback è attivo ogni 15 minuti;
   - il Web Push è implementato, ma il suono non può essere garantito dall'app: dipende da permesso notifiche, browser/PWA, modalità silenziosa e impostazioni del sistema operativo;
   - il service worker push viene registrato all'avvio, senza attendere l'apertura della pagina Notifiche;
   - dopo il primo completamento del profilo, in assenza di un deep-link da preservare, l'utente torna alla Home e vede l'invito “Installa EscoAPesca”;
   - su Android il pulsante usa `beforeinstallprompt` quando disponibile e mantiene un fallback con istruzioni del browser;
   - su iPhone/iPad viene mostrata una guida in tre passaggi: Condividi, Aggiungi alla schermata Home, apertura dalla nuova icona;
   - soltanto quando l'app è aperta in modalità standalone viene proposta l'attivazione delle notifiche; la richiesta di sistema parte sempre da un tocco esplicito;
   - “Non ora” sospende separatamente i promemoria di installazione e notifiche per sette giorni sul dispositivo;
   - manifest, icone, metadati Apple e MIME JSON sono presenti; l'app è alla versione `0.1.5`;
   - resta necessaria una prova end-to-end su telefono reale con app non in primo piano e schermo bloccato.

4. **Storico e moderazione**
   - l'utente può nascondere dal proprio storico un'uscita conclusa e ripristinarla dall'archivio personale;
   - l'Admin può oscurare o ripristinare un'uscita con motivo e audit;
   - l'Admin può annullare un'uscita futura, azzerare i soli dati operativi e cancellare definitivamente soltanto utenti non Admin già disattivati;
   - nascondere dallo storico non elimina il record condiviso né altera metriche e permessi degli altri utenti.

5. **Regole correnti di “Trova”**
   - mostra soltanto uscite `open`, non oscurate, con organizzatore/tecnica/provincia attivi, almeno un posto disponibile e `starts_at >= now()`;
   - ordina per data di inizio crescente, poi per data di creazione: l'uscita più vicina compare in alto, non necessariamente l'ultima creata;
   - include anche l'uscita dell'organizzatore, marcata “La tua uscita”;
   - una volta superato l'orario di inizio, l'uscita non compare più in “Trova” e non accetta nuove richieste o inviti diretti;
   - WhatsApp e link pubblico possono restare disponibili fino alla fine prevista dell'uscita.

### Diagnosi recenti da non ripetere

- L'uscita di prova `EP-14C1D1B22F`, “Surfcasting — Pescia Romana”, era stata creata alle 17:29 circa con inizio alle 18:00 del 30 agosto. Alle 18:47 non compariva più in “Trova” perché `starts_at < now()`: non era un problema di pubblicazione, RLS, posti o moderazione.
- La stessa regola spiegava la scomparsa dell'invito diretto; da `da1a22a` l'azione resta visibile ma disabilitata con un messaggio esplicativo.
- Il reset Admin è stato usato dopo queste prove. Al controllo del 30 agosto alle 19:26 UTC il database operativo conteneva 0 uscite e 0 record collegati, mentre i 5 utenti e profili erano preservati.

### Stato dei P0

| Task | Stato | Commit / nota |
|---|---|---|
| P0.1 — Landing e app allineate | Completato | `1551f52` |
| P0.2 — Copy dell'app | Completato | `2bddd9a` |
| P0.3 — Pagina pubblica stabile | Completato e verificato | `9fa25f9`; metadata e deep-link verificati |
| P0.4 — Condivisione WhatsApp/link | Completato ed esteso | `d064506`, `8d79234`, `9374e89`, `da1a22a` |
| P0.5 — Empty state di Trova | Completato | `5142820` |
| P0.6 — Mini-profilo richiedente | Completato | `8be6b04` |
| P0.7 — Messaggio nella richiesta | Completato | `f4e6c09` |
| P0.8 — Email transazionali | Completato end-to-end | `1ae5a8f`; infrastruttura estesa a Web Push da `821e1ef` |
| P0.9 — Feedback e reminder | Codice e prima richiesta verificati | `c16b074`; reminder organico ancora da osservare dopo nuovi dati reali |
| P0.10 — Home operativa | Completato | `1acda13`, `7da0b2b` |
| P0.11 — Security gate | Completato con eccezione Pro e re-audit warning | `f47b81c`; leaked-password protection non attiva |

P1.1–P1.5, STEP 11B e STEP 11C non sono stati iniziati e non devono partire automaticamente. P1.6 è stato avviato parzialmente per decisione esplicita del 31 agosto: installabilità, manifest, icone, service worker e percorso guidato sono implementati; fallback offline minimo e strategia di aggiornamento/cache restano da valutare prima di dichiararlo completato.

### Stato backend e metriche correnti

Verifica diretta su Supabase del 30 agosto 2026 alle 19:26 UTC:

- 5 utenti totali, 5 attivi, 5 profili completi, 0 utenti test;
- 0 uscite, 0 uscite aperte/scopribili, 0 partecipazioni e 0 inviti diretti;
- 0 feedback, 0 notifiche e 0 record nelle outbox dopo il reset;
- `beta_real_fishing_trips = 0` nel dataset corrente;
- milestone storica di validazione: **1/5**, perché una precedente uscita è stata validata da organizzatore e partecipante prima del reset;
- prima del reset risultavano 9 email `sent` e 2 feedback; questi dati sono evidenza storica, non più conteggiabili dalle tabelle correnti;
- `process-email-outbox` v5: `ACTIVE`, JWT richiesto;
- `process-push-outbox` v3: `ACTIVE`, JWT richiesto;
- `admin-delete-user` v1: `ACTIVE`, JWT richiesto;
- Cron `escoapesca-process-email-outbox`: ogni minuto, attivo;
- Cron `escoapesca-process-push-outbox`: ogni minuto, attivo;
- Cron `escoapesca-enqueue-feedback-prompts`: ogni 15 minuti, attivo.

### Decisioni UX aperte e non implementate

1. **Visibilità delle uscite in corso:** oggi “Trova” elimina l'uscita allo scattare dell'orario di inizio. Valutare con decisione esplicita se mantenerla visibile fino a `ends_at` come “in corso”, oppure mantenere la regola e aggiungere un avviso chiaro quando l'utente crea un'uscita con poco preavviso.
2. **Label della preview pubblica:** “Apri pagina pubblica” è corretto tecnicamente ma poco esplicativo. Candidate: “Anteprima del link condiviso” oppure “Vedi cosa vedranno gli invitati”. Non ancora modificata.
3. **Foto profilo:** è stata discussa l'ipotesi di rendere obbligatoria una foto riconoscibile. Nessun riconoscimento automatico del volto è stato implementato. Prima di introdurlo valutare necessità reale, falsi positivi, accessibilità, privacy/GDPR e moderazione; per la Beta è preferibile eventualmente richiedere una foto senza dichiarare verifica d'identità.
4. **Località costiere:** il selettore copre il dataset Lazio predisposto per il mare. Verificare con utenti reali completezza e nomi di frazioni/località prima di estenderlo; non usare “zona costiera” per laghi e fiumi.
5. **Distribuzione futura negli store:** per ora resta attivo il percorso PWA guidato. La strategia candidata è mantenere il web per acquisizione e pagine pubbliche e valutare in seguito un'app negli store per ritorno e notifiche native. Nessun account store, wrapper o client nativo è stato ancora implementato.

### Eccezioni tecniche note

1. **Leaked password protection:** `Prevent use of leaked passwords` resta disattivato perché richiede Supabase Pro. Non introdurre workaround.
2. **Security Advisor:** restano warning motivati su `pg_net`, RPC pubblica intenzionale e RPC `SECURITY DEFINER`. Fare riferimento a `database/SECURITY_GATE_P0_11.md` e ai test negativi; non revocare funzioni necessarie soltanto per eliminare i warning.
3. **Drift cronologia migrations:** `database/migrations/20260829104956_admin_delete_disabled_user.sql` non risultava nella lista migrations remota pur avendo oggetti e funzione presenti. Riconciliare senza riapplicare ciecamente la DDL.
4. **Documentazione secondaria:** `DEPLOYMENT.md`, `README.md` e `docs/operations/supabase-beta-environment.md` possono contenere riferimenti alla baseline precedente. Questo file e lo stato reale dei servizi prevalgono.
5. **SEO:** metadata della landing e della pagina pubblica sono presenti; le pagine territoriali P1.5 non sono iniziate.

### Validazioni ancora necessarie

1. su iPhone reale: completare Condividi → Aggiungi alla schermata Home, aprire l'icona, attivare il permesso e verificare la nuova subscription Apple;
2. testare Web Push su telefono reale: notifica con app chiusa/in background, apertura deep-link, comportamento con schermo bloccato e aspettative sul suono;
3. su Android reale: verificare comparsa e conferma del prompt nativo di installazione e successiva richiesta push dalla modalità standalone;
4. testare l'invito diretto completo con due account reali e verificare notifica in-app, push e possibilità di chiedere partecipazione prima dell'inizio;
5. ripetere pagina pubblica → registrazione → conferma email → profilo → ritorno all'uscita con un nuovo account reale;
6. osservare un nuovo `feedback_reminder`: massimo uno, nessun invio a chi ha già risposto, deep-link corretto;
7. completare gli stati negativi e i permessi non ancora registrati sistematicamente;
8. decidere esplicitamente il comportamento di “Trova” per le uscite già iniziate;
9. raccogliere nuovi dati del funnel senza azzerarli prima di esportare le evidenze utili;
10. ottenere altre 4 uscite reali validate per arrivare alla milestone storica 5/5;
11. solo dopo il gate valutare il primo P1 realmente giustificato.

### Gate verso P1

- P0 utilizzabile end-to-end: **raggiunto**;
- prima uscita reale storicamente validata: **raggiunta**;
- almeno 5 uscite reali validate: **non raggiunto, 1/5 storico**;
- collo di bottiglia prioritario identificato con dati e interviste: **non raggiunto**.

Il reset ha azzerato i record operativi, non la conoscenza acquisita. Per evitare perdita di evidenza, prima di futuri reset esportare o annotare metriche e validazioni rilevanti.

### File locali da preservare

Restano non tracciati e non devono essere cancellati o inclusi automaticamente in commit tecnici:

- `EscoAPesca_Piano_Operativo_Completo_v1.0.md`;
- `logo-escoapesca-instagram.png`;
- `logo-escoapesca-instagram.svg`;
- `logo-escoapesca.svg`;
- `social-calendar/`;
- `social-launch-kit/`;
- `supabase/.temp/`;
- `tools/create_social_motion_video.py`.

Il presente file `EscoAPesca_Piano_Operativo_Completo_v1.3.md` è invece versionato intenzionalmente per renderlo disponibile nelle nuove chat/worktree dello stesso progetto.

### Baseline verificata

Sulla baseline applicativa pronta `fd31852`, il 31 agosto 2026:

- frontend: 17 file di test, **84/84 test verdi**;
- worker email + push: **9/9 test verdi**;
- build Vinext/Vite di produzione: riuscita;
- `git diff --check`: nessun errore sul codice applicativo;
- server locale di produzione: Home, `manifest.json` e `push-sw.js` hanno risposto HTTP 200; manifest servito come `application/json`;
- Sites v46: deploy pubblico riuscito dalla build di `fd31852`;
- `https://app.escoapesca.it/`, `manifest.json` e `push-sw.js` hanno risposto HTTP 200 dopo il deploy; il manifest è servito come `application/json`;
- GitHub `origin/main` contiene la baseline applicativa `fd31852` e il successivo aggiornamento documentale `659e602`.

### Regola di ripresa

Prima di qualsiasi modifica:

1. leggere per intero questa sezione e verificare branch, status, diff, HEAD, `origin/main`, ultimi commit e versione Sites;
2. distinguere la baseline applicativa pubblicata `fd31852` dai successivi commit esclusivamente documentali;
3. preservare tutti i file locali non tracciati;
4. verificare le metriche Supabase, ricordando che il dataset operativo era vuoto al controllo del 30 agosto;
5. riprodurre e diagnosticare un problema prima di correggerlo;
6. correggere soltanto regressioni o decisioni UX esplicitamente approvate, con test proporzionati, build, commit, push e deploy coerenti;
7. non iniziare P1, STEP 11B o STEP 11C senza il gate;
8. non azzerare nuovamente i dati senza prima salvare le evidenze utili alla validazione.

### Istruzione pronta per una nuova conversazione

Apri e leggi integralmente `EscoAPesca_Piano_Operativo_Completo_v1.3.md`, con priorità alla sezione 29. Verifica lo stato reale di Git, Sites e Supabase prima di agire. La baseline applicativa `fd31852` è pubblicata in Sites v46 e presente su GitHub; i commit Git successivi sono documentali. Il database operativo risultava vuoto dopo reset, ma la milestone storica resta 1/5. I prossimi passi prioritari sono: test installazione e Web Push su iPhone/Android reali, test completo degli inviti diretti, decisione sulla visibilità delle uscite già iniziate, nuova acquisizione controllata e raccolta di altre 4 uscite reali validate. Non iniziare altri P1 o macro-funzionalità non approvate.

---

# Appendice A — Backlog operativo chirurgico completo

> Copia integrale del backlog operativo assunto come fonte di verità per priorità e scope. Lo stato di esecuzione aggiornato è nella sezione 29.

<!-- BEGIN BACKLOG OPERATIVO CHIRURGICO INTEGRALE -->
# EscoAPesca — Backlog operativo chirurgico

## Obiettivo

Portare la Beta attuale da MVP tecnicamente funzionante a prodotto realmente utilizzabile per validare il marketplace.

### North Star Metric

**Numero di uscite realmente svolte tra pescatori che non si conoscevano prima tramite EscoAPesca.**

Non introdurre funzionalità estranee a questo obiettivo prima della validazione del core loop.

Il flusso fondamentale da ottimizzare è:

`visitatore → registrazione → profilo → trova/crea uscita → richiesta → accettazione → conferma → uscita reale → feedback → nuova uscita`

---

# Regole generali per Codex

Per ogni task:

- analizzare prima il codice esistente e le migrazioni già presenti;
- preservare l'architettura attuale basata su React/React Router + Vinext/Vite + App Router wrapper + Cloudflare + Supabase;
- non migrare framework, router, hosting o runtime salvo richiesta esplicita;
- prima di introdurre route server-side verificare la struttura `web-app/app` esistente e integrarsi senza duplicare inutilmente il routing client;
- non duplicare logiche già presenti;
- riutilizzare RPC, eventi, helper, componenti e servizi esistenti quando appropriato;
- mantenere compatibilità con dati e utenti esistenti;
- non modificare il modello di privacy dello spot se non espressamente richiesto;
- nessun dettaglio privato dell'uscita deve diventare pubblico;
- mantenere RLS e controlli server-side come fonte reale dell'autorizzazione;
- non considerare mai sufficiente un controllo esclusivamente frontend;
- aggiungere o aggiornare test quando la logica applicativa cambia;
- eseguire build e test prima di considerare il task completato;
- evitare refactoring non necessari;
- evitare modifiche estetiche non richieste dal task;
- un task deve produrre una modifica concettuale chiara e verificabile;
- preferire commit piccoli e facilmente revertibili;
- non introdurre nuove dipendenze senza verificarne prima la reale necessità;
- non aggiungere API key, service role, secret o credenziali nel repository o nel frontend;
- non inventare configurazioni o credenziali mancanti: documentare il requisito esterno quando necessario.

## Prima di modificare il database

1. controllare schema e migrazioni esistenti;
2. controllare le RPC coinvolte;
3. controllare RLS e grant coinvolti;
4. verificare eventuali trigger ed eventi applicativi già presenti;
5. creare una nuova migration forward-only;
6. non modificare retroattivamente migration già applicate;
7. aggiungere o aggiornare i test SQL di contratto;
8. verificare che la modifica non allarghi involontariamente l'accesso ai dati.

## Prima di chiudere ogni task

Eseguire almeno:

- type-check/build;
- test automatici esistenti;
- nuovi test introdotti dal task;
- verifica manuale minima del flusso interessato;
- verifica desktop;
- verifica mobile quando il task modifica UI o navigazione;
- verifica degli stati negativi e dei permessi quando il task coinvolge autenticazione o dati.

---

# P0 — Prima del lancio Beta reale

---

## P0.1 — Allineare landing pubblica e app allo stato reale della Beta

### Obiettivo

Eliminare qualsiasi discrepanza tra:

- `www.escoapesca.it`
- `app.escoapesca.it`

Il sito pubblico e l'app devono descrivere lo stesso prodotto, lo stesso livello di maturità e lo stesso flusso operativo.

Nessuna funzionalità già disponibile deve essere presentata come futura e nessuna funzionalità non implementata deve sembrare già disponibile.

### Interventi sul sito

Controllare e aggiornare:

- landing pubblica;
- CTA;
- sezioni informative;
- eventuali FAQ;
- Privacy Policy;
- Termini di utilizzo;
- testi relativi alla Beta;
- testi relativi alla protezione dello spot;
- qualsiasi altra descrizione pubblica del funzionamento di EscoAPesca.

### Rimuovere o riformulare

Rimuovere o riformulare tutti i riferimenti a:

- richieste di partecipazione come funzionalità futura;
- conferma dell'uscita come funzionalità futura;
- condivisione privata dei dettagli come funzionalità futura;
- qualsiasi formulazione equivalente a:
  - `in arrivo`
  - `prossimo step`
  - `prossima fase`
  
quando riferita a funzioni già operative.

### Flusso da descrivere

Il sito deve rappresentare correttamente il flusso attuale:

`profilo → trova/crea uscita → richiesta → scelta partecipanti → conferma → dettagli privati`

Non introdurre passaggi non realmente presenti nell'app.

### Privacy delle uscite protette

Spiegare chiaramente che:

- la zona generica dell'uscita è condivisibile;
- il punto preciso e le coordinate non sono pubblici;
- i dettagli privati vengono mostrati solo agli utenti autorizzati secondo il flusso dell'app;
- la condivisione pubblica dell'uscita non deve mai esporre lo spot preciso;
- le informazioni precise restano separate dai dati pubblici dell'uscita.

Non modificare in questo task la logica di autorizzazione: aggiornare la comunicazione affinché rifletta il comportamento reale.

### Posizionamento

Mantenere il focus sul valore principale:

**Trova qualcuno con cui andare a pesca**

Evitare di presentare EscoAPesca principalmente come:

- social network generico;
- feed di contenuti;
- piattaforma per pubblicare liberamente spot e coordinate;
- semplice community;
- applicazione di mappe;
- diario di pesca.

La landing deve comunicare soprattutto che EscoAPesca serve a:

**trovare o proporre uscite di pesca con altre persone, mantenendo protetti gli spot quando necessario.**

### CTA

Quando pertinenti utilizzare CTA coerenti come:

- **Trova un'uscita**
- **Proponi un'uscita**

Verificare che:

- i link puntino alle destinazioni corrette;
- il passaggio sito → app sia coerente con l'autenticazione;
- nessuna CTA porti a una funzione inesistente;
- mobile e desktop abbiano CTA chiaramente raggiungibili.

### Privacy, Termini e Beta

Verificare che:

- Privacy Policy;
- Termini;
- eventuali FAQ;
- descrizioni della Beta;
- testi sulla sicurezza;
- testi sulla condivisione dello spot;

non contraddicano il comportamento dell'app.

Non aggiungere:

- metriche non verificate;
- testimonianze inventate;
- numeri di utenti non dimostrabili;
- numeri di uscite non dimostrabili;
- funzionalità non reali;
- promesse di roadmap presentate come funzionalità disponibili.

### Acceptance criteria

- `www.escoapesca.it` e `app.escoapesca.it` descrivono lo stesso prodotto;
- nessun testo presenta richieste, conferme o dettagli privati come futuri se già disponibili;
- il flusso attuale è rappresentato correttamente;
- è chiaro che zona generica e spot preciso hanno livelli di visibilità differenti;
- il focus resta su **Trova qualcuno con cui andare a pesca**;
- CTA coerenti con `Trova un'uscita` e `Proponi un'uscita`;
- Privacy e Termini non contraddicono il prodotto;
- nessuna funzionalità futura viene presentata come attuale;
- nessuna modifica funzionale all'app viene introdotta da questo task;
- risultato verificato desktop e mobile.

---

## P0.2 — Allineare il copy dell'app allo stato reale del prodotto

### Problema

Alcuni testi dell'app fanno ancora riferimento a:

- `prossimo step`;
- `prossima fase`;
- funzionalità future;

anche se ricerca, creazione, richieste e conferma sono già operative.

Questo fa apparire il prodotto più incompleto di quanto sia.

### Interventi

Controllare almeno:

- `web-app/src/pages/WelcomePage.tsx`
- `web-app/src/pages/ProfilePage.tsx`

e cercare nell'intero progetto:

- `prossimo step`
- `prossima fase`
- `in arrivo`
- `presto`
- altre formulazioni obsolete relative alla Beta.

### Modifica principale

Utente non autenticato:

da un messaggio equivalente a:

> Nel prossimo step potrai trovare o proporre un'uscita.

a:

> Crea il tuo profilo pescatore, trova un'uscita oppure proponine una.

Dopo completamento profilo:

> Profilo completato. Ora puoi trovare un'uscita oppure proporne una.

### Principio

I testi devono sempre guidare verso una funzione realmente disponibile.

### Acceptance criteria

- nessun testo descrive come futura una funzione già disponibile;
- il percorso principale risulta chiaramente:
  `profilo → trova/crea uscita`;
- nessuna funzione viene modificata;
- build e test invariati o verdi.

---

## P0.3 — Rendere ogni uscita condivisibile tramite pagina pubblica stabile

### Obiettivo

Consentire a un pescatore di condividere un'uscita fuori da EscoAPesca.

Questa funzionalità costituisce il principale growth loop iniziale del prodotto.

### Principio

L'uscita deve diventare un oggetto condivisibile.

Un link inviato tramite WhatsApp deve poter portare un nuovo utente direttamente alla specifica uscita.

### Route pubblica

Creare una route pubblica stabile.

Esempio concettuale:

`/u/{tripId}`

oppure altra route equivalente coerente con l'architettura esistente.

Non riutilizzare una route privata in modo ambiguo se questo complica:

- autenticazione;
- rendering server-side;
- metadata;
- permessi.

### Ciclo di vita del link

Il link pubblico non deve funzionare soltanto quando l'uscita è `open`.

Deve restare stabile dopo la condivisione.

Comportamento:

#### Uscita `open` e futura

- pagina visibile;
- CTA partecipazione disponibile;
- posti disponibili mostrati.

#### Uscita `confirmed`

- pagina ancora visibile;
- stato `Uscita confermata`;
- nessuna nuova richiesta.

#### Uscita `cancelled`

- pagina ancora visibile;
- stato `Uscita annullata`;
- nessuna nuova richiesta.

#### Uscita conclusa/completed

- pagina ancora visibile in modalità read-only;
- nessuna nuova richiesta.

Il passaggio di stato non deve trasformare un link già condiviso in un link morto.

### Dati pubblici ammessi

La pagina può mostrare soltanto dati esplicitamente considerati pubblici, ad esempio:

- titolo;
- tecnica;
- data;
- orario;
- provincia;
- zona generica;
- mare/acqua dolce;
- livello consigliato;
- posti disponibili quando pertinente;
- descrizione pubblica;
- stato;
- `Spot protetto` / `Uscita libera`;
- nome/display pubblico dell'organizzatore solo se coerente con il modello Privacy del prodotto.

### Organizzatore

Non ampliare automaticamente l'esposizione di dati personali.

Se `display_name` può contenere dati che fino a oggi erano visibili soltanto agli utenti autenticati, verificare prima:

- Privacy;
- Termini;
- intenzione del campo;
- livello di esposizione appropriato.

Non esporre in P0:

- email;
- telefono;
- fascia d'età;
- foto;
- bio;
- coordinate;
- dati amministrativi dell'organizzatore.

salvo decisione esplicita successiva.

### Dati che non devono apparire mai

Non devono essere esposti tramite pagina, API, HTML, metadata o payload:

- `trip_private_details`;
- coordinate precise;
- punto d'incontro privato;
- note private;
- email;
- telefono;
- dati privati dei partecipanti;
- informazioni amministrative;
- payload interni;
- chiavi Storage;
- identificativi tecnici non necessari all'interfaccia.

### Backend

Prima di implementare:

1. analizzare `public_fishing_trips`;
2. verificare RLS e grant attuali;
3. verificare se sia più corretto:
   - un loader server-side dedicato;
   - una RPC pubblica con output esplicito;
   - una view dedicata e controllata.

Non concedere genericamente `SELECT` anonimo a tabelle o view esistenti senza audit.

Preferire un confine pubblico che restituisca **solo il DTO necessario alla singola uscita**.

Non utilizzare direttamente `fishing_trips` bypassando le policy esistenti.

### CTA

Utente non autenticato:

**Chiedi di partecipare**

→ login/registrazione mantenendo l'uscita di origine.

Utente autenticato con profilo completo:

→ normale flusso di partecipazione.

Utente autenticato con profilo incompleto:

→ completamento profilo → ritorno all'uscita.

### Persistenza del return path

Il deep-link deve sopravvivere a:

`uscita pubblica → login → uscita`

e:

`uscita pubblica → registrazione → conferma email → completamento profilo → uscita`

Il meccanismo `returnTo` o equivalente deve:

- accettare esclusivamente path interni dell'app;
- non accettare URL assoluti;
- non consentire redirect verso domini esterni;
- sopravvivere alla conferma email;
- sopravvivere al reinvio della conferma email;
- sopravvivere al completamento obbligatorio del profilo;
- essere eliminato dopo il consumo;
- avere eventualmente una scadenza ragionevole se persistito localmente.

Non introdurre un open redirect.

### Social preview / Open Graph

La pagina pubblica deve fornire metadata leggibili dai crawler social.

Almeno:

- title;
- description;
- Open Graph title;
- Open Graph description;
- canonical URL.

Esempio:

**Spinning domenica a Fiumicino — EscoAPesca**

Descrizione:

**Uscita di pesca · Spot protetto · Scopri i dettagli e chiedi di partecipare.**

I metadata devono essere generati server-side o comunque presenti nella risposta HTML iniziale: non affidarsi esclusivamente all'esecuzione JavaScript del browser.

### SEO

Il task non deve trasformarsi nel progetto SEO completo.

L'indicizzazione territoriale resta P1.5.

Per le pagine delle singole uscite valutare inizialmente:

`noindex, follow`

mantenendo comunque i metadata Open Graph per la condivisione.

### Privacy/Termini

La disponibilità senza autenticazione modifica il pubblico potenziale dei dati dell'uscita.

Prima di rilasciare la funzione:

- verificare Privacy;
- verificare Termini;
- aggiornare il testo se necessario;
- chiarire quali informazioni dell'uscita diventano visibili anche senza account.

Non attivare pubblicamente dati personali non coperti dal modello informativo esistente.

### Acceptance criteria

- pagina apribile in incognito;
- URL stabile durante tutto il ciclo di vita dell'uscita;
- soltanto `open` + futura consente nuove richieste;
- `confirmed`, `cancelled` e conclusa restano leggibili in modalità appropriata;
- nessun dato privato viene esposto;
- nessun accesso a `trip_private_details`;
- nessun grant anonimo eccessivamente ampio;
- login preserva il deep-link;
- registrazione + conferma email preservano il deep-link;
- completamento profilo preserva il deep-link;
- nessun open redirect;
- preview WhatsApp/social con metadata coerenti;
- test automatici sulla privacy;
- test sugli stati dell'uscita;
- test sul return path;
- verifica incognito desktop/mobile.

---

## P0.4 — Aggiungere “Condividi uscita” subito dopo la creazione

### Obiettivo

Trasformare ogni nuova uscita in una possibilità concreta di acquisizione di nuovi utenti.

### Punto di intervento principale

`web-app/src/pages/CreateTripPage.tsx`

### Stato attuale

Dopo la creazione vengono proposte azioni come:

- Vedi uscita;
- Le mie uscite;
- Crea un'altra uscita.

### Nuova priorità

Inserire come azione principale:

**Condividi l'uscita**

Azioni minime:

- **WhatsApp**
- **Copia link**

Facebook non è necessario per chiudere il P0.

### Link

Utilizzare esclusivamente l'URL pubblico introdotto in P0.3.

Non condividere la route privata autenticata.

### WhatsApp

Generare un testo sintetico dai dati reali.

Esempio:

> Spinning domenica mattina a Fiumicino — cerco un compagno di pesca. Spot protetto. Dettagli su EscoAPesca: {url}

Il testo deve adattarsi almeno a:

- tecnica;
- zona;
- data;
- posti disponibili quando utile;
- uscita protetta/libera.

Non includere:

- coordinate;
- punto privato;
- note private;
- email;
- informazioni dei partecipanti.

### Copia link

Usare Clipboard API.

Prevedere un fallback ragionevole quando non disponibile.

Feedback:

**Link copiato.**

### Altri punti di accesso

Aggiungere `Condividi` anche:

- nel dettaglio dell'uscita dell'organizzatore.

Valutare successivamente la presenza nelle card `Le mie uscite`, senza complicare il P0.

### Social preview

Il link WhatsApp deve utilizzare i metadata introdotti in P0.3.

### Acceptance criteria

- WhatsApp apre correttamente il composer;
- testo leggibile;
- link pubblico corretto;
- link funzionante senza login;
- `Copia link` funziona;
- feedback visibile dopo copia;
- nessun dato privato nel testo;
- mobile e desktop verificati.

---

## P0.5 — Empty state di “Trova” orientato all'attivazione

### Problema

Quando la ricerca restituisce zero risultati, invitare semplicemente l'utente a tornare in futuro aumenta il rischio di abbandono.

In una Beta con bassa densità ogni zero-result deve diventare un'occasione per creare offerta.

### Punto di intervento

`web-app/src/pages/TripDiscoveryPage.tsx`

### Nuovo empty state

Titolo:

**Nessuna uscita con questi filtri**

Testo:

> Non trovi quella giusta? Proponi tu la prossima uscita e condividila con altri pescatori.

CTA primaria:

**Proponi un'uscita**

→ `/crea-uscita`

CTA secondaria:

**Mostra tutto il Lazio**

Mantenere anche:

**Azzera filtri**

se già coerente con l'interfaccia.

### Principio

Un risultato vuoto non deve essere una dead-end page.

### Acceptance criteria

- zero risultati porta sempre a un'azione concreta;
- `Proponi un'uscita` è ben visibile;
- azzeramento filtri continua a funzionare;
- nessuna modifica alla logica di ricerca;
- mobile verificato.

---

## P0.6 — Mostrare un vero mini-profilo del richiedente

### Problema

L'organizzatore deve decidere se andare a pesca con uno sconosciuto e successivamente potrebbe condividere con lui informazioni riservate sul luogo.

Nome + livello non sono sufficienti.

### Obiettivo

Dare all'organizzatore abbastanza contesto per prendere una decisione senza trasformare EscoAPesca in un social network.

### Punto di partenza

`TripRequestsPanel.tsx`

e RPC/servizi utilizzati per:

`list_trip_participation_requests`

### Dati da mostrare

Quando disponibili:

- foto profilo;
- nome/display name;
- fascia d'età;
- comune/zona generica;
- livello;
- tecniche praticate;
- tipo d'acqua;
- breve bio.

Non mostrare ancora metriche di reputazione: vengono introdotte in P1.3.

### Non mostrare

- email;
- telefono;
- coordinate;
- indirizzi;
- dati amministrativi;
- dati di altri utenti;
- informazioni non necessarie alla decisione.

### UX

Card richiesta compatta.

Esempio:

**Marco**

Fiumicino · 40–49  
Intermedio  
Spinning · Surfcasting

`Vedi profilo`

La visualizzazione completa può essere:

- espansione inline;
- modal semplice;
- drawer;

senza introdurre una pagina social completa.

### Backend

Estendere preferibilmente il confine già esistente dedicato alle richieste.

Non concedere:

- SELECT generico su `fisher_profiles`;
- accesso all'intera base utenti;
- possibilità di enumerare profili.

La RPC deve verificare che:

- l'utente autenticato sia l'organizzatore;
- la richiesta appartenga a una sua uscita;
- vengano restituiti esclusivamente i campi necessari.

### Foto profilo

Il bucket `profile-photos` deve restare **privato**.

Non:

- rendere pubblico il bucket;
- rendere pubbliche tutte le foto;
- concedere SELECT generico sulle foto degli altri utenti;
- utilizzare `profile_photo_key` come autorizzazione implicita.

Implementare accesso limitato tramite:

- Storage RLS coerente con la relazione organizzatore/richiedente;

oppure:

- endpoint/server loader autorizzato che genera URL firmati;

scegliendo la soluzione più coerente con l'architettura attuale.

La foto deve essere accessibile soltanto nel contesto autorizzato.

Gli URL firmati devono avere durata limitata.

### Fallback

Se l'utente non ha una foto:

- mostrare avatar/iniziale;
- non rendere la foto obbligatoria.

### Acceptance criteria

- organizzatore vede informazioni utili;
- utente non organizzatore non può leggere il mini-profilo tramite RPC;
- nessuna enumerazione utenti;
- bucket foto resta privato;
- foto non accessibile genericamente;
- nessun PII non necessario;
- card compatta e leggibile da mobile;
- test RPC/RLS aggiornati.

---

## P0.7 — Messaggio breve insieme alla richiesta di partecipazione

### Obiettivo

Consentire al richiedente di presentarsi brevemente senza introdurre una chat completa.

### Modifica dati

Aggiungere a `trip_participants`:

`request_message`

o naming equivalente coerente con lo schema.

### Vincoli

- opzionale;
- massimo 300 caratteri;
- testo semplice;
- trim server-side;
- stringa vuota trattata come `NULL`;
- nessun HTML.

### UI

Prima dell'invio:

**Messaggio per l'organizzatore — opzionale**

Placeholder:

> Es. Pesco spesso in zona e ho macchina e waders.

### Visualizzazione

Il messaggio deve comparire nella card della richiesta dell'organizzatore.

Renderizzare come testo normale.

Non utilizzare HTML raw o `dangerouslySetInnerHTML`.

### RPC

Aggiornare:

`request_trip_participation`

affinché accetti il nuovo parametro opzionale.

### Semantica retry/reinvio

Definire chiaramente:

#### Nuova richiesta

salvare il messaggio.

#### Retry tecnico della stessa richiesta già `requested`

mantenere comportamento idempotente.

#### Richiesta precedentemente `cancelled` e inviata nuovamente

il nuovo invio deve sostituire il messaggio precedente con quello nuovo, eventualmente anche con `NULL`.

Non riutilizzare inconsapevolmente un vecchio messaggio.

### Migration

Aggiornare:

- `trip_participants`;
- constraint;
- tipi TypeScript;
- RPC;
- DTO richieste;
- test DB;
- test frontend pertinenti.

### Validazione

Massimo 300 caratteri:

- frontend;
- backend/database.

Il database rimane la protezione definitiva.

### Acceptance criteria

- richiesta senza messaggio funziona;
- richiesta con messaggio funziona;
- massimo 300 caratteri;
- reinvio dopo cancellazione aggiorna correttamente il messaggio;
- retry idempotente;
- nessun HTML interpretato;
- messaggio visibile soltanto dove autorizzato.

---

## P0.8 — Email transazionali per gli eventi critici

### Obiettivo

Il core loop non deve dipendere dal fatto che l'utente riapra spontaneamente EscoAPesca.

### Principio architetturale

EscoAPesca possiede già:

- `app_events`;
- processamento eventi;
- notifiche in-app;
- deduplica;
- `processed_at`.

Non creare un secondo sistema parallelo di domain events.

**Riutilizzare `app_events` come sorgente degli eventi applicativi.**

### Importante

`app_events.processed_at` identifica già l'elaborazione dell'evento nel sistema di notifiche applicative.

Non utilizzare `processed_at` come indicazione:

`email inviata`.

Il delivery email deve avere uno stato separato.

### Eventi minimi da coprire

Email quando:

1. arriva una nuova richiesta → organizzatore;
2. una richiesta viene annullata dal partecipante → organizzatore;
3. richiesta accettata → partecipante;
4. richiesta rifiutata → partecipante;
5. uscita confermata → partecipanti interessati;
6. uscita annullata → partecipanti interessati;
7. uscita modificata in modo significativo → partecipanti interessati;
8. dettagli privati aggiornati → partecipanti confermati.

La richiesta feedback temporale viene gestita separatamente in P0.9.

### Delivery layer

Introdurre un livello separato, ad esempio:

`notification_deliveries`

oppure:

`email_outbox`

Naming da scegliere coerentemente con il progetto.

Campi concettuali minimi:

- `id`;
- `event_id`;
- `recipient_user_id`;
- `channel`;
- `status`;
- `attempt_count`;
- `next_attempt_at`;
- `last_error`;
- `sent_at`;
- `provider_message_id`;
- `dedupe_key`;
- timestamp di creazione/aggiornamento.

### Idempotenza

Vincolo fondamentale.

La stessa combinazione:

`evento + destinatario + canale`

non deve generare due consegne.

Usare una `UNIQUE` appropriata o un `dedupe_key`.

### Processamento

Il flusso deve essere concettualmente:

`azione utente`

→ `app_event`

→ notifiche in-app esistenti

→ creazione delivery email se prevista

→ worker/Edge Function/processore esterno

→ provider email

L'invio email non deve avvenire all'interno della transazione principale dell'azione utente.

Un problema del provider email non deve causare il fallimento di:

- richiesta;
- accettazione;
- conferma;
- modifica;
- cancellazione.

### Retry

Prevedere:

- numero tentativi;
- errore ultimo tentativo;
- retry controllato;
- backoff ragionevole;
- stato definitivo errore dopo limite tentativi.

Non introdurre loop infiniti.

### Provider

Utilizzare un provider transazionale configurabile.

Se non è ancora presente nel progetto:

- non inventare API key;
- non inserire secret nel repository;
- aggiungere configurazione tramite secret/env;
- documentare cosa deve essere configurato in deploy;
- mantenere separato il provider dalla logica di dominio.

### Indirizzo email

Gli indirizzi email Auth non devono essere esposti al frontend o copiati indiscriminatamente in tabelle pubbliche.

La risoluzione del destinatario deve avvenire lato server con privilegi appropriati.

### Contenuto

Le email devono essere brevi e operative.

Ogni email deve avere:

- motivo;
- nome/titolo uscita;
- CTA;
- deep-link corretto.

### Privacy

Mai includere nell'email:

- coordinate;
- punto preciso;
- note private;
- spot;
- dati privati non necessari.

Per i dettagli privati:

> I dettagli dell'incontro sono disponibili su EscoAPesca.

CTA:

**Vedi l'uscita**

### Deep-link

Le email devono puntare alla pagina autenticata pertinente.

Se l'utente non è autenticato:

- login;
- ritorno automatico alla destinazione iniziale.

Riutilizzare la logica sicura `returnTo` introdotta in P0.3.

### Acceptance criteria

- eventi esistenti riutilizzati;
- nessun secondo sistema di domain events;
- stato email separato da `app_events.processed_at`;
- email unica per evento/destinatario;
- retry controllato;
- errore provider non rompe il flusso utente;
- deep-link corretto;
- nessun dato privato nell'email;
- secret fuori dal repository;
- logging degli errori;
- test idempotenza;
- test delivery.

---

## P0.9 — Richiesta e reminder feedback dopo l'uscita

### Dipendenza

P0.8 deve essere completato prima.

### Problema

La metrica `real_trips` richiede evidenza sia dell'organizzatore sia di almeno un partecipante.

Un'uscita realmente avvenuta può quindi restare non validata se soltanto una parte invia feedback.

### Obiettivo

Aumentare il completamento feedback senza creare spam.

### Trigger

Non utilizzare timer frontend.

Il processo deve essere server-side e schedulato.

Utilizzare:

- Supabase Cron;
- job server-side;
- altra infrastruttura già presente e appropriata;

scegliendo la soluzione coerente con il progetto.

### Prima richiesta

Dopo `ends_at` e soltanto per uscite:

- `confirmed`;
- oppure `completed`;

inviare una richiesta feedback a:

- organizzatore;
- partecipanti `confirmed/completed`.

Delay configurabile.

Default consigliato:

**circa 3 ore dopo `ends_at`**

### Messaggio

> Com'è andata l'uscita? Bastano pochi secondi.

CTA:

`/uscite/{id}/feedback`

### Reminder

Se l'utente non ha ancora inviato feedback:

- massimo un reminder;
- default circa 48 ore dopo la prima richiesta.

Chi ha già risposto non deve ricevere reminder.

### Idempotenza

Il job deve poter essere eseguito più volte senza produrre duplicati.

Utilizzare il delivery layer introdotto in P0.8.

### Esclusioni

Non inviare per:

- uscita cancellata;
- uscita mai confermata;
- utente non appartenente all'uscita;
- feedback già presente.

### Feedback già presente

Controllare `trip_feedback` prima di accodare una consegna.

### Acceptance criteria

- nessuna richiesta prima di `ends_at`;
- nessuna richiesta per uscite cancellate;
- organizer e partecipanti corretti;
- chi risponde non riceve reminder;
- massimo un reminder;
- job idempotente;
- nessun timer browser;
- deep-link funzionante;
- test con date/stati differenti.

---

## P0.10 — Home autenticata orientata alla prossima azione

### Problema

La home autenticata è troppo generica.

### Obiettivo

Quando l'utente apre EscoAPesca deve capire immediatamente:

**Cosa devo fare adesso?**

### Principio

La home non deve diventare un feed social.

Deve essere una dashboard operativa personale.

### Sezione: Azioni richieste

Mostrare prioritariamente le azioni che richiedono intervento.

Esempi:

- `2 richieste da valutare`
- `Conferma il gruppo`
- `La tua richiesta è stata accettata`
- `L'uscita è confermata`
- `Sono disponibili i dettagli dell'incontro`
- `Lascia il feedback`

### Ordine indicativo di priorità

1. feedback scaduto da compilare;
2. richiesta da valutare come organizzatore;
3. uscita da confermare;
4. uscita confermata imminente;
5. dettagli privati disponibili;
6. partecipazione accettata in attesa di conferma;
7. prossima uscita futura.

Non è necessario creare un sistema complesso di scoring.

### Sezione: Prossima uscita

Se presente mostrare:

- titolo;
- data;
- orario;
- stato;
- zona;
- CTA appropriata.

### Sezione: Uscite da scoprire

Mostrare 2–3 uscite disponibili.

Non utilizzare la dicitura:

**Compatibile con te**

finché P1.2 non introduce un vero algoritmo di compatibilità.

Utilizzare la logica di ricerca già disponibile senza costruire un nuovo recommendation engine.

CTA:

**Vedi tutte**

### CTA persistenti

Mantenere chiaramente raggiungibili:

- **Trova un'uscita**
- **Proponi un'uscita**

### Riutilizzare

Logica già presente in:

- `MyTripsPage`;
- notifiche;
- helper di stato;
- calcolo fase temporale;
- servizi di caricamento uscite.

Evitare duplicazione significativa.

Se necessario estrarre helper condivisi.

### Stato senza attività

Se l'utente:

- non organizza;
- non partecipa;
- non ha notifiche;

mostrare direttamente:

> Trova la prossima uscita oppure proponine una.

CTA:

- **Trova un'uscita**
- **Proponi un'uscita**

### Acceptance criteria

- home utile con attività;
- home utile senza attività;
- azione più importante evidente;
- nessun algoritmo di compatibilità introdotto;
- nessun feed social;
- nessuna regressione su `Le mie uscite`;
- mobile verificato.

---

## P0.11 — Security gate finale Supabase prima di ampliare la Beta

### Obiettivo

Ridurre la superficie di rischio dopo l'introduzione dei nuovi flussi P0 e prima di aumentare il numero di utenti reali.

Questo task è una **verifica finale dell'intero confine di sicurezza**, non un refactoring generalizzato.

### A. Leaked password protection

Abilitare la protezione dalle password compromesse in Supabase Auth.

Se non è configurabile tramite il repository/tooling disponibile:

- documentare il passaggio manuale esatto;
- non dichiarare il task completato come automatico se l'opzione non è stata realmente attivata.

### B. RPC `SECURITY DEFINER`

Inventariare tutte le funzioni `SECURITY DEFINER` accessibili da ruoli client.

Per ciascuna verificare:

- `auth.uid()`;
- stato utente;
- ownership;
- ruolo admin dove richiesto;
- parametri;
- `search_path`;
- SQL injection;
- possibilità di enumeration;
- accesso cross-user;
- grant `EXECUTE`;
- output minimo necessario.

Non convertire automaticamente tutte le funzioni in `SECURITY INVOKER`.

Valutare funzione per funzione.

### C. Admin RPC

Confermare esplicitamente che:

- `get_admin_dashboard`
- `admin_set_user_status`
- `admin_cancel_fishing_trip`

non siano utilizzabili da utenti non admin anche conoscendone direttamente il nome RPC.

Aggiungere test negativi.

### D. Spot privati

Test SQL dedicati almeno per:

#### anon

NO.

#### authenticated non partecipante

NO.

#### richiesta `requested`

NO.

#### richiesta `accepted` ma uscita non confermata

NO.

#### partecipante `confirmed`

SÌ.

#### organizzatore

SÌ.

#### uscita cancellata

verificare comportamento previsto e assicurarsi che non allarghi impropriamente l'accesso.

### E. Pagina pubblica P0.3

Testare che l'accesso anonimo possa leggere soltanto il DTO pubblico previsto.

Verificare che non siano esposti:

- `trip_private_details`;
- coordinate;
- email;
- telefono;
- partecipanti;
- foto profilo private;
- campi amministrativi;
- altri record tramite enumeration non prevista.

### F. Mini-profilo P0.6

Testare:

- organizzatore della richiesta → SÌ;
- altro organizzatore → NO;
- altro utente autenticato → NO;
- anon → NO.

### G. Profile photos

Confermare che:

- bucket resta private;
- utente vede la propria foto;
- accessi aggiuntivi sono solo quelli intenzionali;
- nessun listing generale;
- nessun URL permanente pubblico;
- policy Storage coerenti con il modello previsto.

### H. Email/outbox

Verificare:

- tabelle delivery non leggibili genericamente;
- errori provider non accessibili agli utenti;
- email recipient non esposta;
- secret assenti da frontend e DB pubblico;
- worker usa soltanto privilegi necessari.

### I. Security Advisor

Eseguire Supabase Security Advisor.

Per ogni warning residuo:

- correggere;
- oppure documentare esplicitamente perché è intenzionale e sicuro.

Non ignorare warning senza analisi.

### Acceptance criteria

- leaked password protection verificata o deployment step documentato e completato;
- inventario SECURITY DEFINER completato;
- test RLS verdi;
- test pagina pubblica verdi;
- test spot privati verdi;
- test mini-profilo verdi;
- Storage foto verificato;
- Security Advisor rivisto;
- warning residui motivati;
- nessuna regressione funzionale.

---

# P1 — Dopo il primo lancio controllato

Iniziare P1 soltanto dopo:

- P0 completati;
- Beta utilizzabile end-to-end;
- prime uscite reali;
- feedback di utenti reali.

---

## P1.1 — “Avvisami quando esce un'uscita simile”

### Problema

In una marketplace locale, zero risultati possono dipendere semplicemente dal momento.

L'utente non deve essere obbligato a tornare manualmente ogni giorno.

### Comportamento

Quando una ricerca restituisce zero risultati:

CTA:

**Avvisami**

### Preferenze

Salvare almeno:

- provincia;
- zona;
- tecnica;
- acqua.

Eventualmente:

- raggio.

Non introdurre filtri che non esistono realmente.

### Trigger

Quando viene pubblicata una nuova uscita compatibile:

- inviare email;
- eventualmente notifica in-app.

Riutilizzare l'infrastruttura P0.8.

### Idempotenza

Non inviare più notifiche per la stessa:

`ricerca salvata + uscita + utente`

### Gestione

L'utente deve poter:

- vedere gli alert;
- disattivarli.

### Acceptance criteria

- alert salvabile;
- matching deterministico;
- nessun duplicato;
- disattivazione funzionante;
- utilizzo delivery layer esistente.

---

## P1.2 — Ranking di compatibilità

### Obiettivo

Utilizzare meglio i dati del profilo già raccolti.

### Principio

Non creare:

- AI;
- machine learning;
- recommendation engine complesso.

Utilizzare score deterministico e spiegabile.

### Fattori

Valutare:

- tecnica praticata;
- tipo d'acqua;
- livello;
- provincia/zona;
- raggio di spostamento;
- disponibilità.

### Output UI

Preferire:

**Alta compatibilità**

oppure:

**Adatta alle tue preferenze**

Non mostrare percentuali arbitrarie tipo `92%` finché la formula non ha significato facilmente spiegabile.

### Ordinamento

Usare lo score per:

- migliorare ordine risultati;
- proporre 2–3 uscite in home.

Non nascondere le altre uscite.

### Acceptance criteria

- algoritmo deterministico;
- testabile;
- spiegabile;
- nessuna AI;
- nessuna uscita eliminata perché non compatibile;
- fallback corretto per profili incompleti o dati mancanti.

---

## P1.3 — Reputation minima basata su uscite reali

### Obiettivo

Aumentare fiducia senza trasformare il prodotto in un sistema di rating aggressivo.

### Dati ammessi

Basarsi soltanto su eventi verificabili.

Esempi:

- uscite completate;
- eventuali `no_show`;
- `would_repeat`;
- feedback di partecipanti reali.

### Prima fase

Mostrare semplicemente:

**3 uscite completate**

Non mostrare percentuali quando il campione è troppo piccolo.

### Soglia

Definire una soglia minima prima di mostrare statistiche aggregate.

Esempio:

almeno **3 feedback validi**.

### Dopo sufficiente storico

Esempio:

**5 pescatori tornerebbero a pesca con lui.**

oppure:

**4 su 5 tornerebbero a pescare insieme.**

Non esporre commenti privati senza decisione esplicita.

### Evitare

- ranking pubblico utenti;
- leaderboard;
- badge complessi;
- punteggi opachi;
- penalizzazioni automatiche senza verifica.

### Acceptance criteria

- reputazione basata su dati reali;
- soglia minima;
- nessun dato privato;
- niente rating fuorviante su campioni insufficienti.

---

## P1.4 — Navigazione mobile

### Obiettivo

Semplificare la navigazione principale su smartphone.

### Valutare bottom navigation

Voci:

- **Trova**
- **Le mie**
- **Crea**
- **Avvisi**
- **Profilo**

### Rimuovere dalla barra mobile

- Home;
- Esci.

`Esci` deve stare nella pagina Profilo.

### Desktop

La navbar desktop può rimanere invariata se funzionale.

### Vincoli

- supportare safe-area;
- mantenere accessibilità;
- non coprire CTA o contenuti;
- badge Avvisi ancora visibile.

### Acceptance criteria

- massimo 5 azioni principali;
- navigazione sempre comprensibile;
- nessuna regressione desktop;
- verificata su viewport mobile.

---

## P1.5 — Layer SEO pubblico

### Obiettivo

Utilizzare le uscite reali come contenuto utile per acquisizione organica senza trasformare la SPA privata in un sito SEO artificiale.

### Pagine territoriali

Esempi:

- `/uscite-pesca/lazio`
- `/uscite-pesca/roma`
- `/uscite-pesca/fiumicino`
- `/spinning/roma`

### Regola fondamentale

Non generare migliaia di pagine vuote o quasi identiche.

Indicizzare soltanto combinazioni con:

- contenuto reale;
- uscite reali;
- valore per l'utente.

### Singole uscite

Rivalutare il `noindex` introdotto in P0.3.

Decidere se indicizzare soltanto:

- uscite future open;
- oppure anche pagine storiche con sufficiente valore.

### Metadata

Implementare:

- title;
- meta description;
- canonical;
- Open Graph;
- robots;
- sitemap;
- structured data dove realmente appropriato.

### Rendering

Le pagine SEO devono restituire contenuto significativo nell'HTML iniziale.

Non affidarsi a una SPA vuota per l'indicizzazione.

### Privacy

La SEO non deve aumentare il numero di dati personali esposti.

### Acceptance criteria

- pagine indicizzabili realmente utili;
- sitemap coerente;
- canonical corretti;
- niente thin content massivo;
- dati privati esclusi.

---

## P1.6 — PWA

### Obiettivo

Migliorare la frequenza di ritorno senza costruire prematuramente app native.

### Implementare

- manifest;
- icone;
- installabilità;
- service worker;
- aggiornamento sicuro della versione;
- fallback offline minimo.

### Offline

Non tentare di rendere offline:

- creazione uscita;
- richieste;
- conferme;
- dati privati sincronizzati.

Offline minimo sufficiente:

- shell/app;
- messaggio chiaro quando la rete manca.

### Push

Web Push soltanto in task separato successivo, idealmente riutilizzando il delivery layer già introdotto.

### Non fare ancora

- app Android nativa;
- app iOS nativa;
- wrapper inutile soltanto per pubblicare negli store.

### Acceptance criteria

- installabile;
- aggiornabile;
- nessun problema di cache vecchia;
- nessun dato privato persistito offline in modo non previsto.

---

# Fuori scope fino a validazione

Non implementare senza decisione esplicita:

- feed social;
- like;
- follower;
- diario catture;
- galleria catture;
- mappe pubbliche degli spot;
- condivisione libera coordinate;
- previsioni meteo;
- maree;
- solunar;
- AI;
- chatbot;
- recommendation AI;
- gamification;
- badge complessi;
- leaderboard;
- chat completa;
- messaggistica privata generica;
- marketplace attrezzatura;
- e-commerce;
- abbonamenti;
- pubblicità;
- app Android native;
- app iOS native;
- integrazioni non necessarie al core loop.

Qualsiasi proposta di nuova macro-funzionalità deve essere valutata rispetto alla domanda:

**Aumenta concretamente il numero di uscite reali tra pescatori che non si conoscevano prima?**

Se la risposta non è chiaramente sì, rimandarla.

---

# Ordine esecutivo raccomandato

Procedere in questo ordine:

1. **P0.1 — Allineare landing pubblica e app**
2. **P0.2 — Allineare copy dell'app**
3. **P0.3 — Pagina pubblica stabile dell'uscita**
4. **P0.4 — Condivisione WhatsApp/link**
5. **P0.5 — Empty state → proponi uscita**
6. **P0.6 — Mini-profilo del richiedente**
7. **P0.7 — Messaggio nella richiesta**
8. **P0.8 — Email transazionali**
9. **P0.9 — Feedback reminder**
10. **P0.10 — Home orientata alla prossima azione**
11. **P0.11 — Security gate finale**

Solo dopo iniziare P1.

---

# Dipendenze

## P0.3 → P0.4

La condivisione deve utilizzare la pagina pubblica stabile.

## P0.3 → P0.8

La logica `returnTo` deve essere riutilizzabile dai link email.

## P0.6 → P0.7

Il messaggio deve essere mostrato nello stesso contesto della richiesta.

## P0.8 → P0.9

I reminder feedback devono utilizzare il delivery layer già implementato.

## P0.8 → P1.1

Gli alert sulle nuove uscite devono riutilizzare la stessa infrastruttura.

## P0.10 → P1.2

La home può mostrare uscite generiche in P0 e utilizzare il ranking di compatibilità soltanto dopo P1.2.

---

# Definition of Done per la Beta

La Beta può essere considerata pronta per un'acquisizione controllata quando:

- sito pubblico e app descrivono lo stesso prodotto;
- nessun copy importante è obsoleto;
- una singola uscita può essere condivisa tramite URL pubblico;
- l'URL rimane stabile dopo conferma/cancellazione/conclusione;
- WhatsApp mostra una preview coerente;
- un visitatore senza account può vedere i dati pubblici dell'uscita;
- nessun dato privato dello spot è pubblico;
- il visitatore può iniziare la registrazione da quella uscita;
- dopo registrazione + conferma email + profilo torna all'uscita;
- un utente autenticato può chiedere di partecipare;
- può allegare un breve messaggio;
- l'organizzatore dispone di informazioni sufficienti sul richiedente;
- la foto profilo resta protetta;
- l'organizzatore può accettare/rifiutare;
- può confermare l'uscita;
- i partecipanti vengono notificati fuori dall'app;
- problemi del provider email non rompono le operazioni;
- i dettagli privati vengono mostrati esclusivamente agli utenti autorizzati;
- dopo l'uscita entrambe le parti ricevono richiesta feedback;
- chi non risponde riceve al massimo un reminder;
- l'admin può verificare le metriche della Beta;
- la home mostra chiaramente la prossima azione;
- nessun percorso normale richiede intervento manuale del gestore salvo moderazione;
- Security Advisor e test RLS sono stati verificati.

---

# Milestone di validazione

Non aggiungere nuove macro-funzionalità prima di raggiungere almeno:

## Milestone 1

**5 uscite reali validate**

Utilizzare la definizione rigorosa già esistente nel sistema.

Questa milestone serve a dimostrare che il core loop può realmente funzionare.

## Milestone 2

Successivamente:

**20 uscite reali validate**

A quel punto iniziare a valutare seriamente:

- retention;
- reputation;
- matching;
- SEO;
- eventuale monetizzazione futura.

---

# Metriche da osservare

Misurare almeno:

`visitatore → registrazione`

`registrazione → profilo completato`

`profilo → prima richiesta oppure prima uscita creata`

`uscita creata → almeno una richiesta`

`richiesta → accettazione`

`accettazione → conferma`

`conferma → uscita realmente svolta`

`uscita reale → feedback organizzatore`

`uscita reale → feedback partecipante`

`uscita reale → seconda uscita`

### Metriche secondarie utili

- numero medio richieste per uscita;
- tempo creazione → prima richiesta;
- tempo registrazione → prima azione;
- percentuale uscite senza richieste;
- percentuale richieste rifiutate;
- percentuale uscite confermate che diventano `real_trips`;
- percentuale utenti che partecipano a una seconda uscita.

---

# Regola decisionale dopo le prime uscite

Prima di sviluppare nuove funzionalità, analizzare cosa impedisce alle persone di completare il ciclo.

Se il problema è:

### Poche persone vedono le uscite

Lavorare su acquisizione e condivisione.

### Le persone vedono ma non chiedono di partecipare

Lavorare su fiducia, presentazione dell'uscita e profili.

### Le richieste arrivano ma vengono rifiutate

Lavorare su qualità profili e matching.

### Le uscite vengono confermate ma non avvengono

Lavorare su affidabilità, reminder e reputation.

### Le uscite avvengono ma gli utenti non tornano

Lavorare su retention e nuove occasioni.

Non utilizzare lo sviluppo di nuove feature per compensare un problema di distribuzione o liquidità.

---

# Principio finale

EscoAPesca non deve diventare più grande prima di diventare più utile.

La Beta deve dimostrare una cosa semplice:

**una persona che vorrebbe andare a pesca ma non ha con chi andare riesce, tramite EscoAPesca, a trovare qualcuno, organizzare l'uscita, proteggere lo spot e andare realmente a pescare.**

Fino a quando questo comportamento non viene ripetuto con continuità, il lavoro deve restare concentrato su questo ciclo.
<!-- END BACKLOG OPERATIVO CHIRURGICO INTEGRALE -->
