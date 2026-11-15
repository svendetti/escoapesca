# Collaudo funzionale EscoAPesca — 14–15 novembre 2026

Punto di partenza: [PROJECT_REVIEW_2026-11-14.md](PROJECT_REVIEW_2026-11-14.md).
Il 15 novembre sono state consolidate le evidenze senza ripetere i controlli già passati. È stata ripetuta solo la verifica del gruppo dopo aver scoperto un falso positivo e corretto la relativa RPC.

## Esito

Il backend funziona sullo stack Supabase locale ricreato da zero per i percorsi API elencati sotto. **Il collaudo visivo è bloccato e non è stato completato. Il prodotto non è dichiarato pronto.** Non sono stati usati database, account o provider di produzione. Nessun deploy, push, messaggio reale o segreto di produzione importato.

## Ambiente ed evidenze

Docker Desktop avviato; Supabase CLI 3.1.0; stack separato `functional-test`, PostgreSQL 17.11.0.018. Configurazione in [tools/functional-test](../tools/functional-test/README.md), API esclusivamente loopback 54321, database 54322, Mailpit locale 54324. Script API rifiuta URL diversi da loopback. Nessun collegamento remoto configurato nella directory di test. L'isolamento è quello di un progetto/container dedicato, non una sandbox di rete senza egress.

Il primo harness cancellava i job cron: ciò interferiva con una migrazione che ne modifica lo stato. Corretto l'harness per disattivarli conservandoli, poi **reset del solo database locale sintetico** e replay integrale senza resume. Non era un difetto della migrazione. Il contratto 018 vede il flag attivo solo nella propria transazione annullata: il job non diventa visibile al processo cron. Nessun delivery eseguito.

- [Replay originale: 46/46 migrazioni](functional-test-2026-11-14/replay.json).
- [Contratti SQL: 22/22](functional-test-2026-11-14/contracts.json), incluse fixture, RLS e rollback, non semplici controlli di catalogo remoto.
- [Ciclo API e relativo falso positivo documentato](functional-test-2026-11-14/api-cycle.json).
- [Verifica mirata dopo correzione gruppo](functional-test-2026-11-14/group-retest.json).
- [Audit npm finale](review-2026-11-14/audit-functional.json).

La nuova migrazione `20261115083444_fix_trip_group_query.sql` è stata aggiunta **dopo** il replay delle 46 precedenti e applicata soltanto al database locale; verificata con API positive/negative. Il replay da zero della sequenza ora composta da 47 migrazioni non è stato ripetuto, come richiesto dall'utente.

## Le 12 segnalazioni npm iniziali

| Pacchetto inizialmente segnalato | Uso/esposizione ricostruita | Intervento/esito |
| --- | --- | --- |
| @cloudflare/vite-plugin | Build e ambiente di sviluppo Cloudflare, non libreria UI | Aggiornato 1.37.1 → 1.69.1; segnalazione risolta |
| wrangler | CLI/emulazione e packaging; non viene chiamato dai flussi utente | Aggiornato 4.92.0 → 4.162.0; segnalazione risolta |
| miniflare | Emulazione worker locale transitiva | Aggiornato con toolchain; segnalazione risolta |
| ws | WebSocket della toolchain | Aggiornato nel lockfile; segnalazione risolta |
| undici | Trasporto HTTP della famiglia emulatore | Aggiornato con Wrangler; segnalazione risolta |
| esbuild | Compilazione/dev server, rilevanza anche Windows | Aggiornato transitivamente; segnalazione risolta |
| fast-uri | Parser URI transitivo nella toolchain | Aggiornamento compatibile nel lockfile; segnalazione risolta |
| sharp | Dipendenza toolchain/immagini, non il salvataggio foto dell'app | Aggiornato transitivamente; segnalazione risolta |
| image-size | Usato da vinext per dimensioni degli asset/metadata: il solo devDependency non esclude uso server/build | Override limitato a vinext, 2.0.2 → 2.0.3, patch corretta dell'advisory; high risolta |
| @vercel/og | Shim ImageResponse di vinext, uso server potenziale | Moderate residua transitiva da Satori |
| satori | Generazione SVG/OG | Moderate residua. Nessun uso di ImageResponse/next/og o generazione SVG da input utente trovato nell'app; raggiungibilità del codice vulnerabile non dimostrata |
| vinext | Adattatore centrale effettivamente usato a runtime | High image-size eliminata; moderate residua per la catena OG/Satori |

Risultato: **12 → 3 pacchetti segnalati; 9 → 0 high; 0 critical; 3 moderate**. Le tre moderate appartengono alla stessa catena, non dimostrano tre exploit indipendenti. Non sono state forzate sostituzioni incompatibili di Satori o una migrazione maggiore del runtime vinext. Rimane da valutare l'aggiornamento coordinato di quella catena con test di compatibilità.

Fonti: [image-size: patch 2.0.3](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [Satori: escape SVG](https://github.com/advisories/GHSA-wx4j-mvgx-mqwp). Per Satori la sfruttabilità dipende dal rendering e dall'uso dell'SVG: l'assenza di un uso applicativo individuato non equivale a garanzia di assenza di esposizione.

## Matrice funzionale

«Verificato» qui significa richieste dirette allo stack locale e/o contratto SQL, **non interfaccia browser**.

| Passo | Stato | Evidenza e limiti |
| --- | --- | --- |
| 1. Database nuovo | Verificato | 46 migrazioni e seed applicati integralmente; 22 contratti passati. Nuova migrazione gruppo verificata separatamente |
| 2. Registrazione organizzatore/partecipante | Verificato via API | Due account sintetici `@example.invalid`; provisioning e sessioni reali Auth locali |
| 3. Conferma email | Non verificato | Default locale con conferma automatica. Non collaudati click sul link, prefetch, template e ritorno nel browser |
| 4. Onboarding | Verificato via API | Salvataggio profilo per entrambi; dati sintetici, cataloghi seed |
| 5. Creazione e ricerca | Verificato via API | Uscita protetta futura trovata dalla discovery; dettagli privati salvati dall'organizzatore |
| 6. Richiesta e messaggio | Verificato via API | Stato requested restituito dalla RPC con messaggio sintetico |
| 7. Accettazione | Verificato via API | Stato aggiornato; partecipante accepted non legge dettagli privati |
| 8. Capienza esaurita | Verificato parzialmente | Posti pubblici a zero dopo accettazione con capienza 2, organizzatore incluso. Non eseguita gara concorrente con più richiedenti |
| 9. Conferma e spot | Verificato via API | Partecipante confirmed legge i dettagli; prima della richiesta e prima della conferma non li legge |
| 10. Gruppo | Corretto e verificato | Prima: HTTP 400, SQL 0A000 per ORDER BY su UNION. Dopo: partecipante attivo HTTP 200/2 membri |
| 11. Rifiuto | Verificato via API | RPC restituisce rejected su uscita distinta |
| 12. Ritiro e annullamento | Verificato via API | Partecipante ritira richiesta; organizzatore annulla uscita aperta distinta. Non esteso a ritiro/annullamento dopo conferma |
| 13. Feedback | Verificato via API | Entrambi inviano feedback dopo spostamento controllato degli orari delle sole fixture locali. Nessuna attesa reale o reminder provider collaudato |
| 14. Isolamento e cambio account | Verificato parzialmente | Token partecipante non legge profilo organizzatore; logout e nuovo login restituiscono identità corretta. Non verificato storage/browser condiviso o riattribuzione subscription push |
| 15. Revoca | Corretto e verificato | Disabilitato non legge lo spot; RPC gruppo ora restituisce HTTP 403/42501. Non significa revoca immediata universale di tutti i JWT e di tutte le superfici |
| 16. Email/push reali | Non verificato | Provider esterni non configurati o invocati. Cron fermo; nessun invio reale |

## Difetto riprodotto e correzione

La RPC `list_trip_group_members` ordinava un UNION con nomi interpretati come variabili PL/pgSQL: `ORDER BY member_role, display_name` produceva `invalid UNION/INTERSECT/EXCEPT ORDER BY clause`. Il pannello gruppo poteva quindi fallire per utenti autorizzati.

L'asserzione API iniziale accettava qualsiasi errore >=400 come revoca: era un falso positivo. L'evidenza originale è stata riclassificata esplicitamente come fallita. La migrazione nuova usa gli ordinali `ORDER BY 3, 2` e impone anche lo stato attivo del chiamante. Il test ora richiede gruppo attivo leggibile e, per disabilitato, esattamente 403/42501. Dopo applicazione locale: entrambe le prove mirate passano. Nessuna modifica al database di produzione.

## Browser, schermate e screenshot

**Bloccato.** Il browser integrato ha negato l'origine locale, prima 5173 e poi quella corretta 3000, anche dopo consenso testuale dell'utente. Il messaggio dello strumento cita rifiuto di accesso/permesso persistente. Non sono stati usati Chrome, Playwright diretto, CDP, proxy o altre superfici per aggirare il diniego.

Non sono stati acquisiti screenshot in questa sessione, né confronti visivi prima/dopo. Nessun audit visuale è attestato. Desktop, emulazione mobile e telefono reale sono tutti **non verificati**.

| Schermate richieste | Stato visuale |
| --- | --- |
| Home, login, registrazione, controlla email, conferma email | Bloccato dal browser |
| Recupero/aggiornamento password, account disabilitato | Bloccato dal browser |
| Profilo, crea/modifica uscita, discovery | Bloccato dal browser |
| Dettaglio, pagina pubblica, richieste/gruppo/spot privato | Bloccato dal browser |
| Mie uscite, notifiche, feedback, admin | Bloccato dal browser |
| Testi, focus, tastiera, screen reader, contrasto, responsive, errori e caricamenti visivi | Non verificato; i test API non sostituiscono queste prove |

## Controlli già conclusi e prossimo passo

Con dipendenze aggiornate: **104 test frontend, 12 test Node, build TypeScript/vinext e due validatori Python passati**. Rimangono warning sourcemap generati dai plugin RSC e debugName del bundler: build riuscita, qualità sourcemap da valutare in diagnosi. `git diff --check` passato.

Per proseguire occorre sbloccare l'accesso dell'app browser all'origine locale nelle impostazioni effettive; il solo consenso scritto non ha superato il gate. Poi usare lo stack locale e gli account sintetici per catturare tutte le schermate a viewport desktop e mobile, ispezionare i file salvati, verificare accessibilità e ripetere il ciclo dall'interfaccia. Non installare alternative per aggirare la policy. Successivamente: conferma email tramite Mailpit, errori rete, concorrenza posti e cambio account con subscription push. Nessuna dichiarazione di prontezza finché queste verifiche restano aperte.
