// vinext 0.0.50 uses path.relative() as URL cache keys. On Windows this
// produces /assets\file.js, so /assets/file.js falls through to the HTML route.
// Keep this compatibility fix in the Node launcher; never edit node_modules.
export function normalizeStaticCacheKeys(cache) {
  if (!(cache.entries instanceof Map)) {
    throw new Error("vinext static cache changed: review the Windows compatibility fix.");
  }
  cache.entries = new Map(
    [...cache.entries].map(([key, value]) => [key.replaceAll("\\", "/"), value]),
  );
  return cache;
}

export async function installWindowsStaticCacheFix(platform = process.platform) {
  if (platform !== "win32") return;

  const serverUrl = import.meta.resolve("vinext/server/prod-server");
  const { StaticFileCache } = await import(new URL("./static-file-cache.js", serverUrl));
  if (StaticFileCache.__escoapescaNormalized) return;

  const create = StaticFileCache.create;
  StaticFileCache.create = async function (...args) {
    return normalizeStaticCacheKeys(await create.apply(this, args));
  };
  StaticFileCache.__escoapescaNormalized = true;
}
