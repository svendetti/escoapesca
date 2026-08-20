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

Il deploy pubblico comprende landing, privacy e termini su GitHub Pages. Gli STEP 3–6 (autenticazione, profilo, creazione/gestione uscite, elenco con filtri e richiesta/annullamento partecipazione) sono implementati in `web-app/`, collegati al progetto Supabase dedicato `EscoAPesca Beta` e pubblicati su `app.escoapesca.it`. Accettazione/rifiuto delle richieste, conferma dell’uscita, feedback, amministrazione e notifiche utente non sono ancora implementati.

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
