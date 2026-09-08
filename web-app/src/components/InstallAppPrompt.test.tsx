import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/pushNotifications", () => ({
  enablePushNotifications: vi.fn(),
  inspectPushNotifications: vi.fn(),
}));

import { InstallAppPrompt } from "./InstallAppPrompt";

function stubMobileBrowser(userAgent: string, standalone = false) {
  vi.stubGlobal("navigator", {
    maxTouchPoints: 0,
    platform: "",
    standalone,
    userAgent,
  });
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    matchMedia: vi.fn(() => ({ matches: standalone })),
    removeEventListener: vi.fn(),
  });
}

describe("InstallAppPrompt nella schermata di benvenuto", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mostra il pulsante di installazione su Android", () => {
    stubMobileBrowser("Mozilla/5.0 (Linux; Android 16) Chrome/150");

    const html = renderToStaticMarkup(createElement(InstallAppPrompt, { placement: "welcome" }));

    expect(html).toContain("Installa app");
  });

  it("mostra il pulsante dedicato su iPhone", () => {
    stubMobileBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)");

    const html = renderToStaticMarkup(createElement(InstallAppPrompt, { placement: "welcome" }));

    expect(html).toContain("Installa su iPhone");
  });

  it("non mostra l'installazione quando la PWA è già aperta in standalone", () => {
    stubMobileBrowser("Mozilla/5.0 (Linux; Android 16) Chrome/150", true);

    const html = renderToStaticMarkup(createElement(InstallAppPrompt, { placement: "welcome" }));

    expect(html).toBe("");
  });
});
