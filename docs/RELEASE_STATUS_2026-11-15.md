# Consolidamento EscoAPesca — 15 novembre 2026

## Stato del prodotto

Backend e build verificati localmente; **interfaccia non ancora collaudata nel browser** per il diniego già registrato in [FUNCTIONAL_QA](FUNCTIONAL_QA_2026-11-15.md). Non si dichiara il prodotto completamente funzionante o pronto. Il nuovo incarico non autorizza ad aggirare il gate del browser con altre superfici. Restano necessari accesso consentito all'origine locale, collaudo desktop/emulazione mobile e prova distinta su dispositivi reali.

## Lavoro consolidato

- Riparazioni e test dei rapporti precedenti: bootstrap SQL, errori client, returnTo, inviti, pagina pubblica, messaggi, protezione worker push, query gruppo e dipendenze di sicurezza.
- Due nuove migrazioni rispetto alla base remota: `20261115083444_fix_trip_group_query.sql` e `20261115084645_push_recipient_boundary.sql`. Nessuna esecuzione su produzione.
- Il claim push scarta consegne pendenti a destinatari disabilitati, subscription disabilitate/scadute o riassegnate a un altro account. Ricontrolla questi vincoli anche nella query che seleziona i claim. Non può revocare una notifica già inviata dal provider.
- Il logout rimuove la subscription prima della sessione e gestisce errori/retry. Se la revoca della subscription fallisce, il logout non viene dichiarato riuscito; il messaggio resta visibile e il pulsante torna disponibile.
- Le pagine protette vengono rimontate quando cambia account o pathname, impedendo che lo stato locale di un modulo rimanga associato all'uscita precedente. È una mitigazione del codice; la navigazione reale resta da collaudare nel browser.
- Materiali social, loghi e piano v1.0 preesistenti sono stati preservati con un commit separato. Sono materiali storici, non una descrizione aggiornata delle funzionalità.
- CI GitHub `Verify application`: test/build e validatori, token con soli permessi di lettura. Nessun deploy applicativo nella nuova pipeline.

## Matrice finale

| Area | Esito | Evidenza/limite |
| --- | --- | --- |
| Build e TypeScript | Verificato | Build vinext; warning sourcemap/debugName non bloccanti |
| Frontend unitario | Verificato | 106 test in 22 file, inclusi due test logout |
| Contenuti e confine worker | Verificato | 12 test Node; nessun invio reale |
| Bootstrap SQL | Verificato locale | Tutte le 48 migrazioni da DB vuoto; [risultati](functional-test-2026-11-14/replay.json) |
| RLS, RPC e invarianti SQL | Verificato locale | 22 contratti; [risultati](functional-test-2026-11-14/contracts.json). Cron disattivato; il flag del contratto 018 è visibile soltanto nella sua transazione annullata |
| Registrazione e conferma | Verificato API locale | Conferma obbligatoria, verifica Auth del digest sintetico locale, Mailpit riceve email sintetiche. Non collaudato il click sul template nel browser |
| Profilo, uscita, ricerca, messaggio, decisione, conferma, spot e feedback | Verificato API locale | 35 asserzioni nel [ciclo API](functional-test-2026-11-14/api-cycle.json). Per feedback viene spostato l'orario delle sole fixture |
| Capienza concorrente | Verificato API locale | Due decisioni simultanee sull'ultimo posto: una sola riesce; resta un solo accettato. Terzo account sintetico usato solo come concorrente |
| Rifiuto e annullamento | Verificato API locale | Rifiuto, ritiro richiesta e annullamento di uscita aperta. Nessuna nuova semantica introdotta dopo conferma |
| Cambio account e push pendenti | Verificato nel backend | Coda non reclamata per nuovo proprietario dello stesso endpoint; prova locale senza invio. Browser storage e ricezione fisica non verificati |
| Revoca account | Verificato per spot e gruppo | Dettagli non leggibili e diniego 403/42501 al gruppo. Non equivale a invalidazione immediata universale di ogni JWT |
| UI desktop/mobile e accessibilità | Bloccato/non verificato | Nessun nuovo screenshot; nessuna prova di screen reader o telefono reale |
| Provider email/push esterni | Non verificato | Nessun servizio di produzione usato, segreto importato o invio reale |
| Audit dipendenze | Tre moderate residue | [Snapshot finale](review-2026-11-14/audit-final.json); catena vinext/OG/Satori. Nessuna high/critical al controllo; nessun ImageResponse con input utente individuato. Esposizione non attestata assente |

## Git, rami e pubblicazione

`main` è il ramo predefinito e l'unico ramo attuale su `origin` (`https://github.com/svendetti/escoapesca.git`). Alla verifica iniziale locale e remoto coincidevano su `ba1afcb`; nessuna divergenza remota da integrare. Tutte le modifiche presenti sono state preservate.

Il riferimento locale storico `refs/remotes/sites/main` termina su `64058f0` e conserva 12 commit non antenati di main. Contiene una vecchia estrazione dell'app alla root per Sites, con un insieme di funzionalità inferiore a quello attuale. Non viene sovrapposto al monorepo corrente né cancellato: la sua storia esclusiva resta disponibile per eventuale confronto. Non esiste un remoto `sites` configurato né un secondo ramo attuale su origin. Non sono usati force push o riscritture della storia condivisa.

Prima del push è stato interrogato GitHub: Pages è configurato in modalità legacy su `main`, root `/`, dominio `www.escoapesca.it`. Il push attiva automaticamente quella pubblicazione. Il suo effetto è incluso nel push richiesto; non vengono modificate impostazioni di produzione. Non risultavano webhook GitHub. Sites e Supabase non vengono pubblicati o migrati da questo lavoro. Il push del codice verificato `047fa109a63fdf9502f593e6e93a9b894fafe569` è riuscito e il confronto con `git ls-remote` ha confermato l'identità locale/remoto. [CI applicativa superata](https://github.com/svendetti/escoapesca/actions/runs/43697503120) e [Pages completato](https://github.com/svendetti/escoapesca/actions/runs/43697503005). La successiva chiusura documentale mantiene invariato il codice; il suo commit e l'esito delle pipeline vengono riportati nella consegna.

## Verifica CI dopo il primo push

Il primo run Linux ha rilevato due dipendenze opzionali peer `@emnapi` assenti dal lockfile generato su Windows. La correzione aggiunge soltanto quelle due voci, senza aggiornare le versioni delle dipendenze esistenti. Installazione pulita con Node 22/npm 10 in contenitore Linux superata, seguita da CI Linux completa superata: installazione, 106 test frontend, build/TypeScript, entrambi i validatori Python e 12 test worker. Restano avvisi non bloccanti del runner sulle versioni delle actions e sulla futura immagine Ubuntu; non sono errori applicativi.

## Avvio e passi ancora indispensabili

Per installazione e app: [web-app/README](../web-app/README.md). Per database, account sintetici, conferma API, prove concorrenti e server locale senza configurazioni di produzione: [tooling isolato](../tools/functional-test/README.md). Le sole variabili browser sono `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; secret provider e service role non devono essere inseriti nel frontend o committati.

L'intervento indispensabile per completare il collaudo dell'interfaccia è consentire realmente l'accesso dell'app browser all'origine locale nelle sue impostazioni/policy. Il consenso scritto precedente non ha superato il gate. In seguito vanno verificati tutti i flussi dalla UI, stati rete/errore e dispositivi; gli esiti automatici qui sopra non sostituiscono quella verifica. Eventuali deploy dell'app, applicazione delle migrazioni a produzione e modifiche infrastrutturali richiedono un incarico distinto.
