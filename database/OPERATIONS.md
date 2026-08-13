# Esecuzione database Beta v0.1

Lo schema gira su Supabase PostgreSQL 17. Lo STEP 3 usa Supabase Auth per l’identità e Supabase Storage per le foto profilo private; nessuna password viene salvata nelle tabelle applicative.

## Requisiti

- un progetto Supabase dedicato a EscoAPesca;
- PostgreSQL 17 gestito da Supabase;
- estensione standard `pgcrypto` per gli UUID;
- accesso al SQL Editor o Supabase CLI con un ruolo di migrazione;
- Project URL e publishable key per la SPA.

Non inserire mai la `service_role` nella SPA. `app_users.id` coincide con `auth.users.id`; autorizzazione e proprietà sono imposte da RLS tramite `auth.uid()`.

## Ordine di applicazione

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/001_beta_core.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/002_beta_security_and_metrics.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/003_beta_relational_invariants.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/004_beta_indexes_and_rls_performance.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/005_supabase_auth_and_profile.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/006_supabase_advisor_hardening.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/007_profile_rpc_private_boundary.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/seeds/001_beta_lazio_catalogs.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/tests/001_schema_contract.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/tests/002_supabase_auth_profile_contract.sql
```

Le migrazioni sono forward-only e transazionali. Il seed è rieseguibile perché usa `ON CONFLICT`.

## Auth e sessione

La SPA usa la publishable key, che può essere esposta nel browser. Il JWT della sessione identifica l’utente; le policy leggono `auth.uid()` e limitano ogni operazione ai record posseduti. I metadata forniti in registrazione inizializzano dati modificabili del profilo e registrano il consenso, ma non concedono ruoli o privilegi.

Il trigger `auth_user_created` crea in un’unica transazione `app_users`, `fisher_profiles` e le due accettazioni legali. Prima di aprire le registrazioni devono quindi esistere una Privacy Policy e dei Termini attivi nel seed.

In Supabase Auth configurare Site URL e Redirect URLs per:

- l’origine locale, ad esempio `http://127.0.0.1:5173`;
- il dominio applicativo di produzione;
- `/profilo` per la conferma email;
- `/aggiorna-password` per il recupero password.

## Spot privato

- `fishing_trips` contiene esclusivamente zona e dati pubblici.
- `trip_private_details` contiene punto d'incontro, coordinate e note private.
- `public_fishing_trips` non legge la tabella privata.
- RLS sblocca i dettagli all'organizzatore e ai partecipanti autorizzati dopo la conferma dell'uscita.
- Eventi e notifiche rifiutano le chiavi private più comuni nel payload JSON.

`max_participants` comprende sempre l'organizzatore.

## Metriche

- `beta_trip_outcome_evidence`: evidenza separata di organizzatore e partecipanti;
- `beta_real_fishing_trips`: uscite reali verificate per la milestone;
- `beta_metrics`: funnel Beta, ritorno e rapporti principali, escludendo `is_test`.

## Test

Validazioni senza dipendenze, disponibili anche senza PostgreSQL:

```powershell
python tools/validate_database_schema.py
python tools/validate_step3.py
```

I controlli statici non sostituiscono i test SQL. In questo workspace non sono installati né `psql` né Docker: entrambi i file in `database/tests/` devono essere eseguiti sul progetto Supabase dedicato prima di aprire la Beta.
