# P0.11 — Security gate Supabase

Verifica eseguita sul progetto Beta il 27 agosto 2026. Il test eseguibile e
transazionale è database/tests/019_security_gate_contract.sql.

Esito: migration 031 applicata, contratti SQL 001–019 verdi, 50 test frontend
verdi, 5 test del worker email verdi e build di produzione completata.

## Protezione password compromesse

Il Security Advisor conferma che la protezione è ancora disattivata. Il tooling
disponibile non espone la configurazione Auth del progetto, quindi questo punto
non è dichiarato come completato automaticamente.

Passaggio manuale esatto:

1. aprire Supabase Dashboard e selezionare il progetto EscoAPesca;
2. aprire Authentication, Sign In / Providers, Email;
3. nella sezione Password security attivare Prevent use of leaked passwords;
4. salvare;
5. rieseguire Security Advisor e verificare che
   auth_leaked_password_protection non sia più presente.

La funzione è disponibile sui piani Pro e superiori.

## Inventario SECURITY DEFINER client-facing

Tutte le funzioni hanno search_path vuoto, parametri tipizzati, nessun SQL
dinamico e grant espliciti. PUBLIC non può eseguirle.

| Funzione | Chiamante | Vincolo applicativo | Esposizione |
| --- | --- | --- | --- |
| private.is_active_trip_organizer | authenticated, solo da policy | auth.uid, utente attivo, ownership uscita | schema private senza USAGE client |
| admin_cancel_fishing_trip | authenticated | require_current_admin, input validati, audit | solo admin a runtime |
| admin_set_user_status | authenticated | require_current_admin, input validati, protezione self-disable | solo admin a runtime |
| get_admin_dashboard | authenticated | require_current_admin, limite 1–200 | solo admin a runtime |
| cancel_trip_participation | authenticated | auth.uid e ownership della richiesta requested | consente anche a un disabilitato di ritirare solo la propria richiesta |
| confirm_fishing_trip | authenticated | auth.uid, utente attivo, organizer, stato e capienza | output minimo della transizione |
| decide_trip_participation | authenticated | auth.uid, utente attivo, organizer e partecipante della propria uscita | nessun accesso cross-user |
| list_my_trip_feedback | authenticated | auth.uid e utente attivo | solo feedback proprio |
| list_my_trip_participations | authenticated | auth.uid e utente attivo | solo partecipazioni proprie |
| list_trip_participation_requests | authenticated | auth.uid, organizer attivo e ownership uscita | mini-profilo senza contatti |
| request_trip_participation | authenticated | auth.uid, utente attivo, profilo completo, uscita aperta e capienza | messaggio massimo 300 caratteri |
| search_fishing_trips | authenticated | auth.uid e utente attivo, filtri e limite | DTO discovery senza dati privati |
| submit_trip_feedback | authenticated | auth.uid, utente attivo, eleggibilità e input | solo feedback proprio |
| get_public_fishing_trip | anon e authenticated | UUID esatto, organizer attivo, DTO fisso | unica RPC anonima intenzionale |

Le RPC worker claim_email_deliveries e complete_email_delivery sono accessibili
soltanto al service_role e non fanno parte della superficie client.

## Confini verificati

- RPC admin: i tre nomi noti direttamente restituiscono 42501 ai non-admin.
- Spot privato: anon, non partecipante, requested e accepted prima della
  conferma non leggono; confirmed e organizzatore leggono.
- Uscita cancellata: il partecipante perde l’accesso; l’organizzatore conserva
  i dettagli da lui creati, senza estensione a terzi.
- Pagina pubblica: anon legge esclusivamente il DTO dichiarato; tabelle, view,
  dettagli, contatti, partecipanti, foto e campi admin non sono esposti.
- Mini-profilo: solo l’organizzatore dell’uscita legge; altro organizzatore,
  altro autenticato e anon ricevono un diniego.
- Foto profilo: bucket privato; lettura propria e lettura dell’organizzatore
  limitata a requested, accepted e confirmed; nessun listing generale e nessun
  URL pubblico permanente.
- Delivery: outbox, destinatario logico, stato ed errori non sono leggibili dai
  client; nessuna email è duplicata nella tabella; le chiavi provider restano
  secret della Edge Function.

## Security Advisor

La migration 031 aggiunge policy deny-all esplicite a admin_actions, app_events
ed email_outbox, già prive di grant client e con RLS forzata.

Avvisi residui motivati:

- pg_net in public: l’estensione gestita è non relocatable e serve al job HTTP
  del worker email; non può essere spostata con ALTER EXTENSION.
- SECURITY DEFINER eseguibili: corrispondono esattamente all’inventario sopra;
  i test negativi verificano identità, ownership, ruolo, output e grant.
- leaked password protection: resta il solo passaggio manuale indicato sopra.

Gli indici segnalati come unused sono informativi su un database Beta con poco
traffico. Supportano filtri, foreign key e policy già previste, quindi non sono
stati rimossi durante questo gate di sicurezza.
