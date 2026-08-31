import { describe, expect, it } from "vitest";
import {
  detectMobilePlatform,
  isReminderSuppressed,
  isRunningStandalone,
  reminderSuppressionUntil,
} from "./installExperience";

describe("installExperience", () => {
  it("riconosce Android e iPhone senza confondere il desktop", () => {
    expect(detectMobilePlatform("Mozilla/5.0 (Linux; Android 16) Chrome/150")).toBe("android");
    expect(detectMobilePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)")).toBe("ios");
    expect(detectMobilePlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32", 0)).toBe("other");
  });

  it("riconosce iPad che si presenta come Mac", () => {
    expect(detectMobilePlatform("Mozilla/5.0 (Macintosh)", "MacIntel", 5)).toBe("ios");
  });

  it("riconosce l'avvio dalla schermata Home", () => {
    expect(isRunningStandalone(true, false)).toBe(true);
    expect(isRunningStandalone(false, true)).toBe(true);
    expect(isRunningStandalone(false, false)).toBe(false);
  });

  it("sopprime un promemoria soltanto fino alla scadenza", () => {
    const now = Date.UTC(2026, 7, 31);
    const until = reminderSuppressionUntil(now, 7);
    expect(isReminderSuppressed(until, now + 1)).toBe(true);
    expect(isReminderSuppressed(until, now + 8 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});
