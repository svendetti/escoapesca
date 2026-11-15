import { describe, expect, it, vi } from "vitest";
vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));
vi.mock("./pushNotifications", () => ({ disablePushNotifications: vi.fn() }));
import { signOutLocally } from "./signOut";
import { requireSupabase } from "./supabase";
import { disablePushNotifications } from "./pushNotifications";

describe("signOutLocally", () => {
  it("rimuove il dispositivo prima di perdere l'identità e usa solo scope local", async () => {
    const order: string[] = [];
    vi.mocked(disablePushNotifications).mockImplementation(async () => { order.push("push"); return "inactive"; });
    const signOut = vi.fn(async () => { order.push("auth"); return { error: null }; });
    vi.mocked(requireSupabase).mockReturnValue({ auth: { signOut } } as never);
    await signOutLocally();
    expect(order).toEqual(["push", "auth"]);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("rende visibili gli errori auth e consente un nuovo tentativo", async () => {
    vi.mocked(disablePushNotifications).mockResolvedValue("unsupported");
    const signOut = vi.fn().mockResolvedValueOnce({ error: new Error("offline") }).mockResolvedValue({ error: null });
    vi.mocked(requireSupabase).mockReturnValue({ auth: { signOut } } as never);
    await expect(signOutLocally()).rejects.toThrow("offline");
    await expect(signOutLocally()).resolves.toBeUndefined();
  });
});
