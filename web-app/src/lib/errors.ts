const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Email o password non corretti."],
  [/email not confirmed/i, "Conferma l’email prima di accedere."],
  [/token has expired|token not found|invalid token|otp expired/i, "Il link di conferma non è valido o è scaduto. Richiedi una nuova email."],
  [/user already registered/i, "Esiste già un account con questa email."],
  [/password should be at least/i, "La password non rispetta i requisiti minimi."],
  [/rate limit/i, "Troppi tentativi. Attendi qualche minuto e riprova."],
  [/network|fetch/i, "Connessione non disponibile. Controlla la rete e riprova."],
  [/^sessione non valida$/i, "La sessione non è più valida. Accedi di nuovo."],
  [/^completa il profilo prima di partecipare$/i, "Completa il profilo prima di chiedere di partecipare."],
  [/^non ci sono più posti disponibili$/i, "I posti disponibili sono terminati. Aggiorna l’uscita per vedere lo stato attuale."],
  [/^uscita non disponibile per una nuova richiesta$/i, "Questa uscita non accetta più nuove richieste. Aggiorna l’elenco delle uscite."],
  [/^la richiesta è già stata elaborata$/i, "La richiesta è già stata elaborata. Aggiorna l’uscita per vedere lo stato attuale."],
  [/^accetta almeno un partecipante prima di confermare$/i, "Accetta almeno un partecipante prima di confermare l’uscita."],
  [/^il messaggio può contenere al massimo 300 caratteri\.?$/i, "Il messaggio può contenere al massimo 300 caratteri."],
  [/uscita non trovata/i, "Uscita non trovata o non accessibile."],
  [/uscita non (è|e) più modificabile/i, "Questa uscita non è più modificabile."],
  [/uscita non (è|e) più annullabile/i, "Questa uscita non è più annullabile."],
  [/feedback sarà disponibile al termine/i, "Potrai inviare il feedback dopo l’orario di fine uscita."],
  [/feedback è disponibile solo/i, "Il feedback è disponibile solo per le uscite confermate."],
  [/già inviato il feedback/i, "Hai già inviato il feedback per questa uscita."],
  [/completa tutte le risposte/i, "Completa tutte le risposte obbligatorie."],
  [/valutazione deve essere/i, "Scegli una valutazione da 1 a 5 stelle."],
  [/commento non può/i, "Il commento non può superare 1000 caratteri."],
];

export function readableError(error: unknown) {
  const message = typeof error === "string"
    ? error
    : error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  return AUTH_MESSAGES.find(([pattern]) => pattern.test(message))?.[1]
    ?? "Operazione non riuscita. Riprova tra poco.";
}
