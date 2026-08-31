import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function git(...args) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

const trackedChanges = git("status", "--porcelain", "--untracked-files=no", "--", ".");
if (trackedChanges) {
  console.error("La build di release richiede che tutte le modifiche tracciate di web-app siano già committate.");
  process.exit(1);
}

const commitSha = git("rev-parse", "HEAD");
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("Impossibile individuare il client npm usato per avviare la build di release.");
  process.exit(1);
}

const build = spawnSync(process.execPath, [npmCli, "run", "build"], {
  cwd: projectRoot,
  env: { ...process.env, GIT_COMMIT_SHA: commitSha },
  stdio: "inherit",
});

if (build.error) throw build.error;
process.exit(build.status ?? 1);
