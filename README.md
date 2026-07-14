# EscoAPesca — landing 3D

## Ottimizzazione SEO e prestazioni

La build pubblica è una pagina HTML diretta e non utilizza iframe. Il peso di `index.html` è sceso da circa 107 KB a circa 74,6 KB. Sono stati inoltre applicati:

- title, description, canonical, Open Graph, Twitter Card e JSON-LD;
- `robots.txt`, `sitemap.xml` e manifest PWA;
- icone SVG inline senza libreria runtime esterna;
- caricamento differito di Three.js durante un momento inattivo;
- sospensione del rendering 3D quando la scena è fuori schermo;
- riduzione di pixel ratio e particelle senza alterare la composizione;
- contenuti leggibili anche se JavaScript o le animazioni non partono;
- attribuzione UTM e funnel dimostrativo salvati esclusivamente in locale;
- Content Security Policy dimostrativa.

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

## Dati dimostrativi

- Dominio: `www.escoapesca-demo.it`
- Email beta: `beta@escoapesca-demo.it`
- Email privacy: `privacy@escoapesca-demo.it`
- Titolare: `EscoAPesca — progetto beta`

Questi valori sono intenzionalmente fittizi e devono essere sostituiti prima della pubblicazione.

## Form

Il form è funzionante in modalità demo: valida i campi e salva la richiesta nel `localStorage` del browser con la chiave `escoapesca_demo_leads`. Non invia dati a servizi esterni.

Prima della pubblicazione bisogna:

1. collegare un endpoint reale;
2. sostituire i contatti dimostrativi;
3. inserire l'informativa privacy definitiva;
4. configurare analytics e tracciamento con le scelte privacy appropriate;
5. verificare dominio e handle social;
6. rimuovere la dicitura “dati demo”.

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
