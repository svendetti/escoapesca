# Collaudo locale isolato

Non collegare questa directory a progetti remoti. Il container dedicato è
`supabase_db_functional-test`; API su loopback 54321 e database su 54322.
Il tooling non legge `.env.local` dell'app e non importa segreti di produzione.

```powershell
npm.cmd exec --yes --package=supabase@3.1.0 -- supabase start --workdir tools/functional-test --exclude studio,logflare,vector,supavisor,edge-runtime,imgproxy,realtime
python tools/functional-test/replay.py
python tools/functional-test/api_cycle.py
```

`replay.py` richiede un database nuovo: applica tutte le migrazioni, seed e
contratti. Disattiva i job senza cancellarli. Nel contratto 018 attiva il flag
solo nella transazione che termina con ROLLBACK, senza rendere il job visibile
al processo cron. Gli output sono in `docs/functional-test-2026-11-14/`.

`api_cycle.py` registra organizzatore, partecipante e un terzo account di sola prova capienza. Usa account `@example.invalid` e usa solo API loopback.
La configurazione richiede conferma email: lo script legge il solo digest dal database locale e lo verifica tramite Auth. Questo verifica il backend di conferma, non il click sul link o il template nel browser. Mailpit cattura localmente le email.
Per il feedback sposta l'orario delle sole uscite sintetiche tramite il
container dedicato. Non misura l'attesa reale dello scheduler. Il cambio account
è verificato tramite token/API, non tramite storage o interfaccia del browser.

Per ripetere da zero, **solo su questi dati locali sintetici sacrificabili**:

```powershell
npm.cmd exec --yes --package=supabase@3.1.0 -- supabase db reset --no-seed --workdir tools/functional-test --yes
python tools/functional-test/replay.py
python tools/functional-test/api_cycle.py
```

Non aggiungere `--remote`. Non configurare Resend, VAPID o SMTP esterni.
Per fermare e conservare i dati di collaudo:

```powershell
npm.cmd exec --yes --package=supabase@3.1.0 -- supabase stop --workdir tools/functional-test
```

Per aprire la build collegata esclusivamente a questo backend:

```powershell
python tools/functional-test/serve.py
```

La build e il server ricevono solo le variabili pubbliche locali, senza modificare `.env.local`. Il server usa la porta 3000. Non sono avviati worker email/push esterni. La subscription sintetica serve solo a verificare il claim della coda; nessuna consegna Web Push � effettuata.
