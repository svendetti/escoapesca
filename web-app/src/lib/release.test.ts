import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("__APP_VERSION__", "0.1.1");
vi.stubGlobal("__APP_COMMIT__", "abcdef0");

import { formatReleaseLabel } from "./release";

describe("formatReleaseLabel", () => {
  it("collega versione prodotto e commit Git in un’etichetta leggibile", () => {
    expect(formatReleaseLabel("0.1.1", "abcdef0"))
      .toBe("Beta Lazio v0.1.1 · abcdef0");
  });
});
