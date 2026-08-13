# ADR 0001 — Modello dati e confini di sicurezza della Beta

- Stato: accettata per la Beta v0.1
- Data: 13 agosto 2026
- Ambito: solo STEP 2, nessuna interfaccia o autenticazione implementata

## Contesto

Il repository contiene una landing statica e non dispone di backend, autenticazione o database. La Beta deve misurare uscite reali fra persone che non si conoscevano prima, mantenendo il punto preciso delle uscite protette fuori da qualunque superficie pubblica.

## Decisione

La Beta userà PostgreSQL come database relazionale. Lo schema resta indipendente dal framework web e dal fornitore di autenticazione: `app_users.auth_subject` conterrà l'identificativo stabile rilasciato dal provider scelto nello STEP 3, mentre password e credenziali non saranno mai salvate nelle tabelle applicative.

L'applicazione futura sarà un monolite modulare web. Solo un backend attendibile potrà collegarsi al database; il browser non riceverà credenziali SQL. Per ogni transazione autenticata il backend imposterà `app.current_user_id` dopo aver verificato la sessione. Un eventuale provider che esponga PostgreSQL direttamente al client richiederà un adattamento esplicito delle policy ai suoi claim prima del deploy.

## Scelte di modellazione

- `max_participants` comprende l'organizzatore.
- Le tecniche e le disponibilità sono cataloghi database, quindi possono essere estese senza modificare il codice applicativo.
- Provincia e comune non sono codificati come enum. La Beta precarica le province del Lazio e lascia il catalogo dei comuni espandibile con dati territoriali ufficiali.
- La fascia d'età e la conferma di maggiore età sostituiscono la data di nascita completa.
- Gli stati correnti hanno timestamp dedicati; `app_events` conserva gli eventi immutabili necessari a metriche e notifiche.
- Gli account di prova sono marcati con `is_test` e vengono esclusi dalle metriche.

## Stati

Uscita:

```text
Draft → Open → Confirmed → Completed
   └──────┴──────────────→ Cancelled
```

Partecipazione:

```text
Requested → Accepted → Confirmed → Completed
         ↘ Rejected
Accepted/Confirmed → Cancelled
Confirmed → NoShow
```

Le transizioni saranno applicate dal service layer negli step funzionali successivi. Lo schema impedisce valori sconosciuti e conserva i timestamp, ma non introduce ancora trigger complessi di workflow.

## Spot protetto

I campi pubblici dell'uscita risiedono in `fishing_trips`. Punto d'incontro, coordinate e note riservate risiedono esclusivamente in `trip_private_details`.

La vista `public_fishing_trips` non legge la tabella privata. La Row Level Security consente di leggere i dettagli privati solamente a:

- organizzatore;
- partecipante `Accepted`, `Confirmed` o `Completed`, ma solo dopo che l'uscita è `Confirmed` o `Completed`.

Neppure il ruolo amministratore riceve accesso automatico allo spot preciso. Un partecipante rifiutato, cancellato o `NoShow` non mantiene accesso. Le email future non dovranno contenere coordinate o dettagli privati: notificheranno solo che sono disponibili dopo il login.

## Evidenza di uscita reale

Una uscita entra nella vista `beta_real_fishing_trips` solo quando:

1. l'organizzatore dichiara che si è svolta;
2. almeno un partecipante dichiara che si è svolta;
3. almeno un partecipante dichiara di aver pescato con una persona conosciuta tramite EscoAPesca.

Un solo feedback produce quindi un'uscita “dichiarata”, non una uscita reale verificata per la milestone.

## Matching iniziale

Lo scoring sarà implementato soltanto nello STEP 12. La formula approvata come base è:

- tecnica: 30 punti;
- provincia/zona: 20;
- disponibilità: 20;
- tipo d'acqua: 10;
- livello: 10;
- distanza rispetto al raggio dichiarato: 10.

Prima dello score si applicano vincoli di ammissibilità: account attivo, profilo completo, uscita futura/aperta, capienza, compatibilità acqua, utente non organizzatore e non già iscritto.

## Contatti e privacy

La Beta non condividerà automaticamente telefono o email. La comunicazione minima sarà composta da notifiche interne, email prive di dati dello spot e informazioni organizzative private nell'uscita. Un'eventuale condivisione futura del contatto richiederà opt-in per singola uscita.

Le accettazioni legali sono versionate in `legal_documents` e `legal_acceptances`. Foto profilo e coordinate saranno riferimenti a storage o valori database, mai inseriti in eventi analytics generici.

## Rinviato intenzionalmente

- scelta del provider di autenticazione;
- framework web;
- chat e messaggi;
- PostGIS e geolocalizzazione live;
- push native;
- recensioni pubbliche;
- algoritmo di recommendation avanzato.
