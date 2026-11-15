import { describe, expect, it, vi } from "vitest";
import { loadPublicTripActionState, requestPublicTripParticipation } from "./publicTripAction";

function clientWith(overrides: Record<string, { data: unknown; error?: unknown }> = {}, session = true) {
  const results = {
    app_users: { data: { status: "active" } },
    fisher_profiles: { data: { completed_at: "2026-08-01" } },
    fishing_trips: { data: null },
    trip_participants: { data: null },
    ...overrides,
  };
  return {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: session ? { user: { id: "user-1" } } : null }, error: null }) },
    from: vi.fn((table: keyof typeof results) => {
      const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue(results[table]) };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    }),
  };
}

describe("loadPublicTripActionState", () => {
  it("non esegue query utente per un visitatore", async () => {
    const client = clientWith({}, false);
    await expect(loadPublicTripActionState(client as never, "trip-1")).resolves.toBe("guest");
    expect(client.from).not.toHaveBeenCalled();
  });

  it("distingue profilo completo, incompleto, organizzatore e disabilitato", async () => {
    await expect(loadPublicTripActionState(clientWith() as never, "trip-1")).resolves.toBe("ready");
    await expect(loadPublicTripActionState(clientWith({ fisher_profiles: { data: null } }) as never, "trip-1")).resolves.toBe("profile");
    await expect(loadPublicTripActionState(clientWith({ fishing_trips: { data: { id: "trip-1" } } }) as never, "trip-1")).resolves.toBe("manage");
    await expect(loadPublicTripActionState(clientWith({ app_users: { data: { status: "disabled" } } }) as never, "trip-1")).resolves.toBe("disabled");
  });

  it("conserva lo stato accettato e permette una nuova richiesta dopo il ritiro", async () => {
    for (const status of ["accepted", "requested", "confirmed", "rejected", "completed", "no_show"]) {
      await expect(loadPublicTripActionState(clientWith({ trip_participants: { data: { status } } }) as never, "trip-1")).resolves.toBe(status);
    }
    await expect(loadPublicTripActionState(clientWith({ trip_participants: { data: { status: "cancelled" } } }) as never, "trip-1")).resolves.toBe("ready");
  });

  it("non interpreta errori di lettura come profilo incompleto o richiesta assente", async () => {
    for (const table of ["app_users", "fisher_profiles", "fishing_trips", "trip_participants"]) {
      const error = { message: "Backend unavailable" };
      await expect(loadPublicTripActionState(clientWith({ [table]: { data: null, error } }) as never, "trip-1")).rejects.toBe(error);
    }
  });

  it("non abilita azioni se la sessione o l'account non sono leggibili", async () => {
    const client = clientWith();
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: new Error("Auth unavailable") });
    await expect(loadPublicTripActionState(client as never, "trip-1")).rejects.toThrow("Auth unavailable");
    await expect(loadPublicTripActionState(clientWith({ app_users: { data: null } }) as never, "trip-1")).rejects.toThrow("Account non disponibile");
  });
});

describe("requestPublicTripParticipation", () => {
  it("invia il messaggio opzionale normalizzato e controlla la risposta", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ participation_status: "requested" }], error: null });
    await requestPublicTripParticipation({ rpc } as never, "trip-1", "  Porto i waders  ");
    expect(rpc).toHaveBeenCalledWith("request_trip_participation", { p_trip_id: "trip-1", p_request_message: "Porto i waders" });
    await requestPublicTripParticipation({ rpc } as never, "trip-1", "  ");
    expect(rpc).toHaveBeenLastCalledWith("request_trip_participation", { p_trip_id: "trip-1", p_request_message: null });
    await expect(requestPublicTripParticipation({ rpc } as never, "trip-1", "a".repeat(301))).rejects.toThrow("300");
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("non dichiara successo se il backend rifiuta o non restituisce lo stato", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(requestPublicTripParticipation({ rpc } as never, "trip-1", "")).rejects.toThrow("stato valido");
    const error = { message: "Posti esauriti" };
    rpc.mockResolvedValue({ data: null, error });
    await expect(requestPublicTripParticipation({ rpc } as never, "trip-1", "")).rejects.toBe(error);
  });
});
