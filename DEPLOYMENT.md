# EscoAPesca — checklist di deploy

## Stato del deploy

- [x] Pubblicazione su GitHub Pages dalla branch `main`, cartella root.
- [x] Modulo Tally reale, mobile-first e suddiviso in tre passaggi.
- [x] Contatti reali, consenso obbligatorio e informativa privacy collegata.
- [x] UTM principali inoltrate al questionario.
- [ ] Revisione legale finale dell'informativa rispetto al trattamento effettivo.
- [ ] Configurazione analytics e conversioni, se necessarie, con gestione del consenso.
- [ ] Dominio personalizzato e immagine Open Graph raster 1200×630.
- [ ] Test di una candidatura reale e verifica della notifica/routine di risposta.

## Prestazioni

- Attivare Brotli, con gzip come fallback.
- Servire HTML con `Cache-Control: no-cache`.
- Servire asset versionati con `Cache-Control: public, max-age=31536000, immutable`.
- Usare HTTP/2 o HTTP/3 e una CDN europea.
- Valutare il self-hosting di Three.js e dei font dopo il primo test pubblico.

## Header consigliati

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://tally.so; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-src https://tally.so; connect-src https://tally.so; object-src 'none'; base-uri 'self'; form-action 'self' https://tally.so; frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Verifica finale

Eseguire PageSpeed Insights e Search Console sull’URL HTTPS definitivo. Controllare LCP, INP, CLS, indicizzazione, sitemap, canonical e anteprima social.
