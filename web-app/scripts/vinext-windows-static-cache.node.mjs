import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { installWindowsStaticCacheFix, normalizeStaticCacheKeys } from "./vinext-windows-static-cache.mjs";
import { tryServeStatic } from "vinext/server/prod-server";

test("normalizes Windows cache keys on every test platform", () => {
  const asset = {};
  const cache = { entries: new Map([["/assets\\entry-abcdef.js", asset]]) };
  assert.equal(cache.entries.get("/assets/entry-abcdef.js"), undefined);
  normalizeStaticCacheKeys(cache);
  assert.equal(cache.entries.get("/assets/entry-abcdef.js"), asset);
  assert.throws(() => normalizeStaticCacheKeys({}), /static cache changed/);
});

test("static JS/CSS use URL keys and MIME types, while the build manifest stays private", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "escoapesca-assets-"));
  try {
    await mkdir(path.join(root, "assets"));
    await mkdir(path.join(root, ".vite"));
    await writeFile(path.join(root, "assets", "entry-abcdef.js"), "export const ready = true;");
    await writeFile(path.join(root, "assets", "app-abcdef.css"), "body { color: blue; }");
    await writeFile(path.join(root, ".vite", "manifest.json"), "{}");

    await installWindowsStaticCacheFix("win32");
    await installWindowsStaticCacheFix("win32"); // Installing twice must be harmless.
    const { StaticFileCache } = await import(new URL("./static-file-cache.js", import.meta.resolve("vinext/server/prod-server")));
    const cache = await StaticFileCache.create(root);
    assert.ok(cache.lookup("/assets/entry-abcdef.js"));
    assert.equal(cache.lookup("/.vite/manifest.json"), undefined);

    for (const [url, mime, expected] of [
      ["/assets/entry-abcdef.js", "application/javascript", "export const ready = true;"],
      ["/assets/app-abcdef.css", "text/css", "body { color: blue; }"],
    ]) {
      let status, headers, body;
      const res = { writeHead(code, values) { status = code; headers = values; }, end(value) { body = value; } };
      assert.equal(await tryServeStatic({ method: "GET", headers: {} }, res, root, url, false, cache), true);
      assert.equal(status, 200);
      assert.equal(headers["Content-Type"], mime);
      assert.equal(body.toString(), expected);
    }
    assert.equal(cache.lookup("/assets/missing.js"), undefined);
    assert.equal(cache.lookup("/assets/../.vite/manifest.json"), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
