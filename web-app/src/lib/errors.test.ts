import { describe, expect, it } from "vitest";
import { readableError } from "./errors";

describe("readableError", () => {
  it("traduce gli errori plain-object restituiti dalle RPC Supabase", () => {
    expect(readableError({ message: "Email not confirmed", code: "email_not_confirmed" }))
      .toBe("Conferma l’email prima di accedere.");
    expect(readableError({ message: "Uscita non trovata", code: "P0002" }))
      .toBe("Uscita non trovata o non accessibile.");
  });

  it("continua a tradurre Error e stringhe", () => {
    expect(readableError(new Error("Invalid login credentials"))).toBe("Email o password non corretti.");
    expect(readableError("Failed to fetch")).toContain("Controlla la rete");
  });

  it("indica azioni utili per profilo incompleto, capienza e sessione scaduta", () => {
    expect(readableError({ message: "Completa il profilo prima di partecipare" })).toContain("Completa il profilo");
    expect(readableError({ message: "Non ci sono più posti disponibili" })).toContain("terminati");
    expect(readableError({ message: "Sessione non valida" })).toContain("Accedi di nuovo");
  });

  it("non espone dettagli SQL, provider o messaggi sconosciuti", () => {
    const fallback = "Operazione non riuscita. Riprova tra poco.";
    for (const error of [null, undefined, {}, { message: 42 }, { message: "SQL internal secret" }]) {
      expect(readableError(error)).toBe(fallback);
    }
  });
});
