const RETURN_PATH_KEY = "escoapesca:return-path";
const RETURN_PATH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const APP_ORIGIN = "https://app.escoapesca.it";

type StoredReturnPath = {
  path: string;
  expiresAt: number;
};

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function normalizeInternalReturnPath(value: string | null | undefined) {
  if (!value) return null;
  const candidate = value.trim();
  if (
    candidate.length === 0
    || candidate.length > 512
    || !candidate.startsWith("/")
    || candidate.startsWith("//")
    || candidate.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return null;
  }

  try {
    const parsed = new URL(candidate, APP_ORIGIN);
    if (parsed.origin !== APP_ORIGIN) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function encodeStoredReturnPath(path: string, now = Date.now()) {
  const normalized = normalizeInternalReturnPath(path);
  if (!normalized) return null;
  return JSON.stringify({
    path: normalized,
    expiresAt: now + RETURN_PATH_TTL_MS,
  } satisfies StoredReturnPath);
}

export function decodeStoredReturnPath(value: string | null, now = Date.now()) {
  if (!value) return null;
  try {
    const stored = JSON.parse(value) as Partial<StoredReturnPath>;
    if (typeof stored.expiresAt !== "number" || stored.expiresAt <= now) return null;
    return normalizeInternalReturnPath(stored.path);
  } catch {
    return null;
  }
}

export function rememberReturnPath(path: string) {
  const encoded = encodeStoredReturnPath(path);
  const storage = browserStorage();
  if (!encoded || !storage) return null;
  storage.setItem(RETURN_PATH_KEY, encoded);
  return decodeStoredReturnPath(encoded);
}

export function peekReturnPath() {
  const storage = browserStorage();
  if (!storage) return null;
  const path = decodeStoredReturnPath(storage.getItem(RETURN_PATH_KEY));
  if (!path) storage.removeItem(RETURN_PATH_KEY);
  return path;
}

export function consumeReturnPath() {
  const storage = browserStorage();
  if (!storage) return null;
  const path = decodeStoredReturnPath(storage.getItem(RETURN_PATH_KEY));
  storage.removeItem(RETURN_PATH_KEY);
  return path;
}

export function withReturnPath(route: string, returnPath: string | null) {
  return returnPath
    ? `${route}?returnTo=${encodeURIComponent(returnPath)}`
    : route;
}
