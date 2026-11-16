# Collaudo assistito e dettaglio compatto — 16 novembre 2026

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
