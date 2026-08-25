import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(resolve(projectRoot, "package.json"), "utf8"),
) as { version: string };

function releaseCommit() {
  const environmentCommit = process.env.GIT_COMMIT_SHA?.trim();
  if (environmentCommit) return environmentCommit.slice(0, 7);

  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "dev";
  }
}

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const isTest = Boolean(process.env.VITEST);
  const cloudflare = isTest
    ? null
    : (await import("@cloudflare/vite-plugin")).cloudflare;

  return {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __APP_COMMIT__: JSON.stringify(releaseCommit()),
    },
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
