# EscoAPesca — landing pubblica e Beta

## Stato del repository

Questo repository contiene la landing pubblica e l’applicazione web della Beta Lazio.

- La landing statica resta pubblicata su `www.escoapesca.it` tramite GitHub Pages.
- I materiali in `social-launch-kit` e `social-calendar` supportano l'acquisizione dei primi utenti.
- Gli STEP 3–6 della Beta sono implementati in `web-app/`: registrazione, login, recupero password, profilo pescatore, creazione/gestione delle uscite, elenco con filtri e richieste di partecipazione.
- L’app è collegata al progetto Supabase dedicato `EscoAPesca Beta` ed è pubblicata su `app.escoapesca.it`; la landing indirizza registrazione, accesso, ricerca e creazione verso l’app.
- Le dipendenze locali in `.tools` servono esclusivamente alla generazione dei contenuti media e non fanno parte dello stack applicativo.
- Il modello dati Supabase/PostgreSQL e l'ordine delle migrazioni sono documentati in `database/OPERATIONS.md`.

La metrica primaria della Beta è il numero di uscite reali organizzate tra pescatori che non si conoscevano prima tramite EscoAPesca.

## Ottimizzazione SEO e prestazioni

La landing pubblica è una pagina HTML statica. Sono stati inoltre applicati:

- title, description, canonical, Open Graph, Twitter Card e JSON-LD;
- `robots.txt`, `sitemap.xml` e manifest PWA;
- icone SVG inline senza libreria runtime esterna;
- caricamento differito di Three.js durante un momento inattivo;
- sospensione del rendering 3D quando la scena è fuori schermo;
- riduzione di pixel ratio e particelle senza alterare la composizione;
- contenuti leggibili anche se JavaScript o le animazioni non partono;
- propagazione di `utm_source`, `utm_medium`, `utm_campaign` e `utm_content` ai collegamenti verso l’app;
- Content Security Policy limitata alle dipendenze effettivamente utilizzate.

I Core Web Vitals reali devono essere misurati nuovamente dopo il deploy HTTPS, perché hosting, CDN, compressione e latenza non sono simulabili con il file locale.

## Identità visiva

La landing utilizza il marchio EscoAPesca v1: pesce geometrico, correnti interne e amo chartreuse. Le versioni vettoriali per sfondo scuro, chiaro e icona sono disponibili nella cartella `outputs/escoapesca-brand` insieme alla guida d’uso.

## Revisione UI/UX Pro Max

La landing è stata sottoposta a una revisione con UI/UX Pro Max. Gli interventi applicati includono:

- tipografia Outfit + Work Sans;
- CTA chartreuse ad alto contrasto, ispirata alle esche tecniche e distinta dai segnali di fiducia turchesi;
- navbar flottante e persistente;
- linguaggio coerente con le funzionalità effettivamente disponibili nella Beta;
- skip link per navigazione da tastiera;
- focus visibili su tutti gli elementi interattivi;
- controllo di contrasto, hover e riduzione del movimento;
- mantenimento di una sola conversione primaria;
- nessuna testimonianza o metrica inventata prima della validazione.

## Avvio

Aprire `index.html` in un browser moderno. Per un test più fedele, servirlo tramite un server HTTP locale.

Esempio:

```powershell
python -m http.server 8765
```

Poi aprire `http://127.0.0.1:8765/`.

## Pubblicazione e contatti

- Sito principale: `https://www.escoapesca.it/`
- URL GitHub Pages di origine: `https://svendetti.github.io/escoapesca/`
- Applicazione Beta: `https://app.escoapesca.it/`
- Registrazione: `https://app.escoapesca.it/registrati`
- Email beta e privacy: `social@escoapesca.it`
- Titolare del trattamento: Simone Vendetti

L’informativa dell’app è disponibile in `privacy-beta.html` e viene collegata dalla landing e dal flusso di registrazione. `privacy.html` resta disponibile come informativa storica per le candidature raccolte tramite il precedente modulo Tally.

## Flusso di acquisizione

La landing non raccoglie dati personali e indirizza l’utente verso l’app. La registrazione, la conferma email e il completamento del profilo avvengono su `app.escoapesca.it`. Il precedente modulo Tally non fa più parte del flusso pubblico principale.

Prima di avviare campagne a pagamento bisogna ancora:

1. verificare con un professionista il testo privacy rispetto all'uso effettivo dei dati;
2. configurare eventuali analytics e conversioni con le scelte privacy appropriate;
3. uniformare i contatti e gli handle social definitivi;
4. eseguire test periodici del percorso landing → registrazione → profilo → uscita.

Consultare anche `DEPLOYMENT.md` per cache, compressione e header di produzione.

## Caratteristiche grafiche

- scena subacquea WebGL/Three.js;
- esca 3D animata, banco di pesci, bolle e correnti luminose;
- camera 3D reattiva a puntatore e profondità di scroll;
- manifesto cinetico con sonar e tipografia oversize;
- campo di caustiche, bolle e correnti su più livelli di parallasse;
- indicatore di profondità collegato all'avanzamento nella pagina;
- animazioni allo scroll senza scroll-jacking;
- card con inclinazione tridimensionale;
- simulazione interattiva dello spot protetto;
- layout responsive;
- fallback grafico se WebGL o la libreria 3D non sono disponibili;
- supporto a `prefers-reduced-motion`.

La direzione immersiva riprende i principi di scena continua e trasformazione progressiva osservati nella reference Igloo, reinterpretandoli in acqua con un'identità originale EscoAPesca.

La scena 3D e i font vengono caricati da CDN. Per una pubblicazione definitiva si può scegliere se mantenere i CDN oppure includere le dipendenze nel progetto.
