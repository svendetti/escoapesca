export type MobilePlatform = "ios" | "android" | "other";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

export const INSTALL_PROMPT_AVAILABLE_EVENT = "escoapesca:install-prompt-available";
export const APP_INSTALLED_EVENT = "escoapesca:app-installed";

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let captureInitialized = false;

export function detectMobilePlatform(
  userAgent: string,
  navigatorPlatform = "",
  maxTouchPoints = 0,
): MobilePlatform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/mac/i.test(navigatorPlatform) && maxTouchPoints > 1) return "ios";
  return "other";
}

export function isRunningStandalone(
  displayModeStandalone: boolean,
  navigatorStandalone = false,
) {
  return displayModeStandalone || navigatorStandalone;
}

export function initializeInstallExperience() {
  if (captureInitialized || typeof window === "undefined") return;
  captureInitialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(INSTALL_PROMPT_AVAILABLE_EVENT));
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new Event(APP_INSTALLED_EVENT));
  });
}

export function hasInstallPrompt() {
  return deferredInstallPrompt !== null;
}

export async function requestInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const prompt = deferredInstallPrompt;
  if (!prompt) return "unavailable";

  await prompt.prompt();
  const choice = await prompt.userChoice;
  deferredInstallPrompt = null;
  return choice.outcome;
}

export function isReminderSuppressed(value: string | null, now = Date.now()) {
  if (!value) return false;
  const until = Number(value);
  return Number.isFinite(until) && until > now;
}

export function reminderSuppressionUntil(now = Date.now(), days = 7) {
  return String(now + days * 24 * 60 * 60 * 1000);
}
