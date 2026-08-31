import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("./pushNotifications", () => ({
  ensurePushServiceWorker: vi.fn().mockResolvedValue(undefined),
}));

import { initializeClientStartup } from "./clientStartup";

describe("initializeClientStartup", () => {
  it("registra installazione e service worker dall'entry point client", () => {
    const windowListeners = new Map<string, EventListener>();
    const windowAddEventListener = vi.fn((name: string, listener: EventListener) => {
      windowListeners.set(name, listener);
    });
    const serviceWorkerAddEventListener = vi.fn();

    vi.stubGlobal("window", {
      addEventListener: windowAddEventListener,
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("document", { readyState: "loading" });
    vi.stubGlobal("navigator", {
      serviceWorker: { addEventListener: serviceWorkerAddEventListener },
    });

    initializeClientStartup();

    expect(windowAddEventListener).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function));
    expect(windowAddEventListener).toHaveBeenCalledWith("appinstalled", expect.any(Function));
    expect(windowAddEventListener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });
    expect(serviceWorkerAddEventListener).toHaveBeenCalledWith("message", expect.any(Function));
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});
