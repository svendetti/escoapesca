import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const isTest = Boolean(process.env.VITEST);
  const cloudflare = isTest
    ? null
    : (await import("@cloudflare/vite-plugin")).cloudflare;

  return {
    plugins: [
      vinext(),
      sites(),
      ...(cloudflare
        ? [
            cloudflare({
              viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
              config: {
                main: "./worker/index.ts",
                compatibility_flags: ["nodejs_compat"],
              },
            }),
          ]
        : []),
    ],
    server: { port: 5173 },
    preview: { port: 4173 },
  };
});
