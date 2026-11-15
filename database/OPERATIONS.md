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

Bootstrap **solo di un ambiente Supabase nuovo e isolato**, dalla root del repository. Occorrono anche gli schemi/ruoli Supabase Auth/Storage e le estensioni usate dalle migrazioni (Vault, pg_cron, pg_net): PostgreSQL vuoto da solo non basta. `DATABASE_URL` deve riferirsi al database di collaudo, mai alla Beta attiva. Al 15 novembre 2026 sono presenti 48 migrazioni e 22 contratti SQL.

```powershell
if (!$env:DATABASE_URL) { throw 'Configura DATABASE_URL per il database isolato' }
Get-ChildItem -LiteralPath database/migrations -Filter '*.sql' |
  Sort-Object Name | ForEach-Object {
    psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Migrazione fallita: $($_.Name)" }
  }
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/seeds/001_beta_lazio_catalogs.sql
if ($LASTEXITCODE -ne 0) { throw 'Seed fallito' }
Get-ChildItem -LiteralPath database/tests -Filter '*.sql' |
  Sort-Object Name | ForEach-Object {
    psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Contratto fallito: $($_.Name)" }
  }
```

L'ordine lessicografico attuale è `001`–`033`, poi le migrazioni con timestamp da `20260829104956` fino a `20261115084645`. Non fermarsi a `012`: mancherebbero colonne, RPC e policy usate dall'app attuale. La storia remota usa timestamp anche per le prime migrazioni: non usare questo bootstrap per riallineare una produzione già migrata. La correzione degli apici in `009` ripara il sorgente di bootstrap, non richiede di riapplicarlo al database esistente. Il replay completo resta da collaudare in ambiente isolato.

Il seed è rieseguibile perché usa `ON CONFLICT`. I contratti comprendono fixture e rollback: anche se transazionali, non sono una suite da eseguire sui dati reali. I job di delivery richiedono i secret descritti sotto; il bootstrap non configura i provider né dimostra il recapito.

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

## Richieste di partecipazione

- `request_trip_participation` accetta richieste soltanto da utenti attivi con profilo completo, su uscite aperte e future organizzate da altri utenti.
- `cancel_trip_participation` consente di annullare esclusivamente una propria richiesta ancora in stato `requested`.
- Le scritture avvengono tramite RPC con controlli espliciti; la tabella espone in lettura soltanto le righe dell’utente autenticato.
- Ogni cambio effettivo registra un evento senza dati privati dello spot, pronto per le notifiche successive.

## Gestione e conferma delle partecipazioni

- `list_trip_participation_requests` espone all’organizzatore soltanto nome, livello e stato delle richieste della propria uscita.
- `decide_trip_participation` serializza le decisioni sulla singola uscita e impedisce di superare i posti disponibili.
- `confirm_fishing_trip` richiede almeno un partecipante accettato, conferma gli accettati e rifiuta le richieste ancora pendenti.
- Le transizioni registrano eventi applicativi; contatti e dettagli privati dello spot restano esclusi.

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

### Delivery email

La migration `028_email_delivery_outbox.sql` crea una outbox separata da `app_events.processed_at`, RPC accessibili soltanto al `service_role` e il job Cron `escoapesca-process-email-outbox`. Il worker Supabase è in `supabase/functions/process-email-outbox/`.

Prima di abilitare l’invio reale configurare i secret `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` e `APP_BASE_URL` sulla Edge Function. URL progetto e chiave pubblicabile usati dal Cron devono risiedere in Vault come `escoapesca_project_url` e `escoapesca_publishable_key`. Non salvare chiavi nel repository.

Il worker applica cinque tentativi massimi con backoff 2/4/8/16 minuti e recupera claim interrotti dopo 15 minuti. Un provider non configurato non preleva la coda.

### Security gate P0.11

Applicare database/migrations/031_security_gate_hardening.sql, quindi eseguire
database/tests/019_security_gate_contract.sql. Il verbale, l’inventario delle
RPC SECURITY DEFINER, gli avvisi Advisor motivati e il passaggio manuale per la
protezione password compromesse sono in
[SECURITY_GATE_P0_11.md](SECURITY_GATE_P0_11.md).

### Prompt feedback

La migration `030_feedback_prompt_scheduler.sql` pianifica il job `escoapesca-enqueue-feedback-prompts` ogni 15 minuti. Il job accoda la prima richiesta circa 3 ore dopo `ends_at` e un solo reminder dopo altre 48 ore, esclusivamente per organizzatore e partecipanti confermati/completati che non hanno ancora inviato feedback. I delay sono parametri della funzione `private.enqueue_due_feedback_prompts`.

### Reset operativo Admin

La migration `032_admin_operational_reset.sql` espone la RPC distruttiva
`admin_reset_operational_data`, protetta sia dal ruolo Admin verificato nel
database sia dalla frase `ELIMINA USCITE`. Elimina esclusivamente dati operativi
della Beta e conserva account, profili, preferenze, consensi, ruoli e cataloghi.
Applicare la migration ed eseguire
`database/tests/020_admin_operational_reset_contract.sql` prima della
pubblicazione del relativo bottone Admin. Il test non esegue il reset.

I controlli statici non sostituiscono i test SQL. Nella revisione del 14 novembre 2026 manca `psql`; Docker CLI è presente ma il daemon non è attivo. I 22 contratti devono essere collaudati dopo un replay completo su un ambiente isolato. Il verbale storico P0.11 e la presenza delle migrazioni remote non sostituiscono questa verifica.
