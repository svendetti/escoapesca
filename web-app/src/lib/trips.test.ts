import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ requireSupabase: vi.fn() }));
import { discoveryRpcArgs } from "./trips";

describe("discoveryRpcArgs", () => {
  it("invia filtri vuoti come null", () => {
    expect(discoveryRpcArgs({ provinceCode: "", techniqueId: "", waterType: "", date: "" })).toEqual({
      p_province_code: null,
      p_technique_id: null,
      p_water_type: null,
      p_starts_from: null,
      p_starts_before: null,
      p_limit: 50,
    });
  });

  it("converte una data locale in un intervallo di un giorno", () => {
    const args = discoveryRpcArgs({ provinceCode: "RM", techniqueId: 3, waterType: "sea", date: "2026-09-14" });
    const from = new Date(args.p_starts_from!);
    const before = new Date(args.p_starts_before!);

    expect(args.p_province_code).toBe("RM");
    expect(args.p_technique_id).toBe(3);
    expect(args.p_water_type).toBe("sea");
    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(8);
    expect(from.getDate()).toBe(14);
    expect(before.getDate()).toBe(15);
  });
});
