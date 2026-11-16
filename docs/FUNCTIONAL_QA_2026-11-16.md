# Collaudo assistito e dettaglio compatto — 16 novembre 2026

## Preparazione prova su telefono nella LAN

Il launcher supporta `--lan-host`: usa l'IPv4 del PC per il solo endpoint browser
del backend sintetico. La configurazione CLI resta obbligatoriamente loopback;
l'indirizzo alternativo deve appartenere a RFC1918 ed essere assegnato a
un'interfaccia locale. Verificati rifiuto di IP pubblico, IP documentale, IP
privato non assegnato e stringa invalida (tutti exit 2). Build LAN e server
avviati; `.env.local`, firewall e router non modificati.

Accesso da telefono, flussi touch e layout restano da confermare dall'utente.
La LAN HTTP non verifica PWA/service worker/push. Usare gli account sintetici
già confermati; nessuna modifica agli URL Auth o ai provider di produzione.

## Iterazione successiva: navigazione mobile e inviti dedicati

Implementata su richiesta la barra inferiore a cinque tab sotto 900px:
Home/Trova/Uscite/Avvisi/Profilo. Icone Lucide con etichette visibili, stato
attivo e badge accessibile. Header ridotto a brand, Proponi e menu account;
desktop conserva i link. Previsti spazio inferiore, safe area e offset del
salvataggio sticky del profilo. Le richieste restano nel dettaglio; inviti e
condivisione sono in `/uscite/:tripId/inviti`. Dopo creazione, due azioni distinte
portano a gestione e inviti. L'editor privato resta espandibile nel dettaglio.

La route inviti usa AuthGuard e la query `loadFishingTrip(user.id, tripId)`,
filtrata per organizzatore; test aggiunto per filtro e riga assente. I test col
router reale verificano destinazioni, stato attivo nelle sottopagine e badge.
I test del layout verificano menu assenti per ospiti/disabilitati e azioni per
account attivi/admin. Totale: 117 test frontend, oltre a 2 Node sul serving Windows.

Durante questi test, le trasformazioni vinext RSC sul router CommonJS causavano
`ReferenceError: route is not defined`, mentre l'importazione Node riusciva.
Vitest ora usa il plugin React; la build mantiene vinext/Cloudflare. Problema
del percorso di test, non classificato come bug dimostrato della UI. Nessuna
nuova dipendenza o aggiornamento pacchetti.

Restano da verificare: rendering desktop e viewport 320/390/768px, menu account,
ritorno dagli inviti, tastiera virtuale, safe area e salvataggio profilo su
telefono reale. Il browser automatico resta indisponibile: nessun nuovo screenshot
o misura di sovrapposizione è attestato dopo questi interventi.

## Evidenze ricevute dall'utente

Il browser automatico resta indisponibile. Le verifiche seguenti derivano dai
messaggi e dagli screenshot forniti dall'utente in Chrome desktop sul server
locale; non attestano test autonomi, emulazione mobile o dispositivo reale.

| Verifica | Esito | Evidenza e limite |
| --- | --- | --- |
| Avvio e rendering home | Verificato manualmente | Dopo la correzione MIME, conferma «si compare» e screenshot `412aa060` con home autenticata |
| Registrazione e onboarding | Parzialmente documentato | Gli screenshot mostrano sessioni autenticate e profili sintetici; non documentano da soli tutti i passaggi di registrazione, conferma email e salvataggio del profilo |
| Creazione uscita | Verificato manualmente nella lista | Screenshot `49cff6ef`: EP-E963E4481A, Surfcasting — Civitavecchia, aperta, 22 novembre, max 2 |
| Ricerca con secondo account | Verificato manualmente | Screenshot `73363ab9`: stessa uscita in discovery, organizzatore Account TEST, pulsante richiesta |
| Invio richiesta | Verificato manualmente | Screenshot `5df49b41`: conferma di invio e stato Richiesta inviata |
| Notifica interna organizzatore | Verificato manualmente | Screenshot `4678cab9`: Account Principiante richiede di partecipare, contatore avvisi 1; non è un test di consegna push |
| Ricezione richiesta nel dettaglio | Verificato manualmente | Screenshot `1b9d0860` e `ac48c2ed`: 1 da valutare, pulsanti Accetta/Rifiuta; nessuna prova di accettazione già eseguita |
| Accettazione, conferma, dettagli privati e feedback dalla UI | Non verificato | Restano valide le prove backend precedenti; non equivalgono a ciclo UI |
| Mobile e accessibilità interattiva | Non verificato | Screenshot desktop, anche con zoom differente; nessuna misura di altezza o screen reader |

I riferimenti abbreviati identificano gli allegati della chat. Le immagini
includono parti del browser personale e non vengono copiate nel repository pubblico.

## Intervento circoscritto sulla leggibilità

Negli screenshot il blocco richieste era preceduto da identità dell'organizzatore,
due riquadri inviti e una lista verticale di informazioni. L'utente ha chiesto di
compattare e integrare questi contenuti mantenendo la coerenza grafica.

- Informazioni essenziali integrate sotto titolo/data, su due colonne da mobile
  e tre da desktop; rimossa la scheda separata con le stesse informazioni.
- Richieste e conferma immediatamente dopo il riepilogo; rimossa solo per
  l'organizzatore la card ridondante «Organizza Tu».
- Inviti e condivisione in un solo riquadro espandibile: icone Lucide 0.468.0 con
  licenza inclusa e testi brevi. Ricerca inline aperta da Invita, senza seconda
  card; focus all'input e ritorno al pulsante alla chiusura.
- Editor dei dettagli privati espandibile per l'organizzatore. Le informazioni
  autorizzate del partecipante restano visibili come prima.
- Pulsanti con etichette visibili, summary nativi e area minima 44px; non si
  dichiara conformità accessibile sulla sola base del codice.

Test esistenti e build verificano compilazione e regressioni coperte, non la
qualità visiva. Confronto dopo il ricaricamento e prova mobile restano richiesti.
Nessuna modifica a database, autorizzazioni o semantica di accettazione/conferma.

## Valutazione delle pagine dedicate (proposta, non implementata)

Il dettaglio deve mantenere riepilogo, richieste, conferma e gruppo nello stesso
percorso: separarli imporrebbe navigazione ripetuta durante la decisione.
La pagina modifica è già separata. Se il collaudo della versione compatta mostra
ancora eccessivo scorrimento, i candidati sensati sono una pagina Inviti
(ricerca/selezione/condivisione) e una pagina di modifica delle indicazioni
private, mantenendo il punto d'incontro consultabile nel dettaglio.

Le nuove route richiederebbero ritorno al dettaglio, gestione delle modifiche non
salvate, permessi e prove dirette. Sono una decisione di navigazione da valutare,
non un prerequisito dimostrato per questa correzione.
