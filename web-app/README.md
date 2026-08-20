# EscoAPesca Beta web app

SPA mobile-first della Beta, attualmente completata fino allo STEP 6. Il sito pubblico nella root del repository resta indipendente.

## Configurazione locale

1. Crea un progetto Supabase dedicato a EscoAPesca.
2. Applica in ordine le migrazioni e il seed descritti in `../database/OPERATIONS.md`.
3. Copia `.env.example` in `.env.local`.
4. Inserisci Project URL e publishable key. Non usare mai la `service_role` nel browser.
5. In Supabase Auth configura Site URL e Redirect URLs per l'origine locale e quella di produzione.

```powershell
npm.cmd install
npm.cmd run dev
```

## Verifica

```powershell
npm.cmd test
npm.cmd run build
```

Il deploy deve riscrivere tutte le rotte della SPA verso `index.html`, incluse `/profilo`, `/trova-uscita` e `/aggiorna-password`.
