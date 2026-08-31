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
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npmCommand, ["run", "build"], {
  cwd: projectRoot,
  env: { ...process.env, GIT_COMMIT_SHA: commitSha },
  stdio: "inherit",
});

if (build.error) throw build.error;
process.exit(build.status ?? 1);
