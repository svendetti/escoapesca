import { installWindowsStaticCacheFix } from "./vinext-windows-static-cache.mjs";

await installWindowsStaticCacheFix();
// Retain vinext's CLI argument parsing, dotenv loading and server behavior.
await import("../node_modules/vinext/dist/cli.js");
