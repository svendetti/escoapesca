# Ambiente Supabase — EscoAPesca Beta

## Progetto

- Nome: `EscoAPesca Beta`
- Project ref: `aujrjfiwoduetdftwqzl`
- Regione: `eu-west-1`
- Piano: Free, 0 €/mese alla creazione
- PostgreSQL: 17
- Creato: 13 agosto 2026

Il progetto Supabase preesistente che contiene le tabelle `turno_*` appartiene a Presenze e non è stato modificato.

## Stato applicato

Sono registrate sette migrazioni remote, corrispondenti ai file `001`–`007` in `database/migrations/`. Il seed Lazio ha creato:

- 5 province;
- 13 tecniche di pesca;
- 5 fasce di disponibilità;
- Privacy Policy e Termini Beta versionati;
- bucket privato `profile-photos` con limite 3 MB.

Le 18 tabelle pubbliche hanno RLS e FORCE RLS. Le tabelle delle funzionalità non ancora implementate rimangono senza grant e senza policy permissive.

## Collaudo eseguito

- entrambi i test SQL del repository superati sul database reale;
- Data API anonima: cataloghi accessibili, `app_users` negata con HTTP 401;
- registrazione Auth temporanea riuscita;
- trigger di provisioning verificato: utente, profilo e 2 consensi legali;
- RPC profilo verificata con ruolo `authenticated` e JWT simulato;
- completamento profilo calcolato dai trigger;
- isolamento RLS verificato con un UUID differente;
- account di collaudo e record collegati eliminati; database utenti nuovamente vuoto.

## Advisor Supabase

Gli advisor non riportano warning di sicurezza sulle funzioni. Restano esclusivamente:

- avvisi informativi `RLS Enabled No Policy` sulle tabelle mantenute intenzionalmente in deny-by-default fino agli step successivi;
- avvisi `Unused Index`, attesi su un database nuovo e senza traffico.

Riferimenti advisor: [RLS senza policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [indici non usati](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Configurazione applicazione

`web-app/.env.local` contiene soltanto Project URL e publishable key ed è escluso da Git. Non contiene chiavi segrete o `service_role`.

Il deploy Sites è disponibile sull'URL tecnico `https://escoapesca-beta.devillsit.chatgpt.site`. Il dominio `app.escoapesca.it` è stato aggiunto all'hosting e richiede i record DNS elencati in `DEPLOYMENT.md`.

Prima di aprire le registrazioni restano da configurare in Supabase Auth:

- Site URL definitivo della SPA;
- Redirect URL definitivo per `/profilo`;
- Redirect URL definitivo per `/aggiorna-password`;
- eventuale SMTP personalizzato, necessario sul piano Free per personalizzare i template email dei nuovi progetti.

Il dominio definitivo della SPA è `https://app.escoapesca.it`.
