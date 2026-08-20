const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Email o password non corretti."],
  [/email not confirmed/i, "Conferma l’email prima di accedere."],
  [/user already registered/i, "Esiste già un account con questa email."],
  [/password should be at least/i, "La password non rispetta i requisiti minimi."],
  [/rate limit/i, "Troppi tentativi. Attendi qualche minuto e riprova."],
  [/network|fetch/i, "Connessione non disponibile. Controlla la rete e riprova."],
  [/uscita non trovata/i, "Uscita non trovata o non accessibile."],
  [/uscita non (è|e) più modificabile/i, "Questa uscita non è più modificabile."],
  [/uscita non (è|e) più annullabile/i, "Questa uscita non è più annullabile."],
];

export function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return AUTH_MESSAGES.find(([pattern]) => pattern.test(message))?.[1]
    ?? "Operazione non riuscita. Riprova tra poco.";
}
