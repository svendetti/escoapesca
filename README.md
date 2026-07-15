# EscoAPesca — landing 3D

## Ottimizzazione SEO e prestazioni

La build pubblica è una pagina HTML statica; il solo questionario beta è incorporato da Tally con caricamento differito. Sono stati inoltre applicati:

- title, description, canonical, Open Graph, Twitter Card e JSON-LD;
- `robots.txt`, `sitemap.xml` e manifest PWA;
- icone SVG inline senza libreria runtime esterna;
- caricamento differito di Three.js durante un momento inattivo;
- sospensione del rendering 3D quando la scena è fuori schermo;
- riduzione di pixel ratio e particelle senza alterare la composizione;
- contenuti leggibili anche se JavaScript o le animazioni non partono;
- propagazione di `utm_source`, `utm_medium` e `utm_campaign` al questionario Tally;
- Content Security Policy limitata alle dipendenze effettivamente utilizzate.

I Core Web Vitals reali devono essere misurati nuovamente dopo il deploy HTTPS, perché hosting, CDN, compressione e latenza non sono simulabili con il file locale.

## Identità visiva

La landing utilizza il marchio EscoAPesca v1: pesce geometrico, correnti interne e amo chartreuse. Le versioni vettoriali per sfondo scuro, chiaro e icona sono disponibili nella cartella `outputs/escoapesca-brand` insieme alla guida d’uso.

## Revisione UI/UX Pro Max

La landing è stata sottoposta a una revisione con UI/UX Pro Max. Gli interventi applicati includono:

- tipografia Outfit + Work Sans;
- CTA chartreuse ad alto contrasto, ispirata alle esche tecniche e distinta dai segnali di fiducia turchesi;
- navbar flottante e persistente;
- linguaggio coerente della candidatura beta;
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
- Modulo pubblico: `https://tally.so/r/zxoGMR`
- Email beta e privacy: `devillsit@gmail.com`
- Titolare del trattamento: Simone Vendetti

L'informativa completa è disponibile in `privacy.html` e viene collegata sia dalla landing sia dal consenso nel questionario.

## Form

Il form Tally è operativo e divide la candidatura in tre passaggi: profilo, uscita ideale e consenso finale. Le risposte vengono registrate nell'account Tally collegato al progetto; la landing non conserva copie nel browser.

Prima di avviare campagne a pagamento bisogna ancora:

1. verificare con un professionista il testo privacy rispetto all'uso effettivo dei dati;
2. configurare eventuali analytics e conversioni con le scelte privacy appropriate;
3. decidere dominio e handle social definitivi;
4. configurare notifiche e routine di risposta ai candidati;
5. eseguire un test completo con una candidatura reale autorizzata.

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
