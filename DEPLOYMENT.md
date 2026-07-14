# EscoAPesca — checklist di deploy

## Prima del deploy

1. Sostituire `escoapesca-demo.it`, email e titolare dimostrativi.
2. Collegare il form a un endpoint reale con protezione antispam e gestione delle cancellazioni.
3. Pubblicare privacy policy, termini/regole della beta e consensi definitivi.
4. Configurare analytics e conversioni nel rispetto delle scelte privacy.
5. Creare un’immagine Open Graph raster 1200×630 e aggiungerla ai metadati.

## Prestazioni

- Attivare Brotli, con gzip come fallback.
- Servire HTML con `Cache-Control: no-cache`.
- Servire asset versionati con `Cache-Control: public, max-age=31536000, immutable`.
- Usare HTTP/2 o HTTP/3 e una CDN europea.
- Valutare il self-hosting di Three.js e dei font dopo il primo test pubblico.

## Header consigliati

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Verifica finale

Eseguire PageSpeed Insights e Search Console sull’URL HTTPS definitivo. Controllare LCP, INP, CLS, indicizzazione, sitemap, canonical e anteprima social.

