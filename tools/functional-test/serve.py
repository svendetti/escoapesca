"""Build and serve against the disposable local stack, without production env."""
import json
import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
npm = "npm.cmd" if os.name == "nt" else "npm"
raw = subprocess.check_output([npm, "exec", "--yes", "--package=supabase@3.1.0", "--", "supabase", "status", "--workdir", str(root / "tools/functional-test"), "-o", "json"], text=True)
config = json.loads(raw[raw.index("{"):])
assert config["API_URL"] == "http://127.0.0.1:54321", "Only local API is allowed"
env = {**os.environ, "VITE_SUPABASE_URL": config["API_URL"], "VITE_SUPABASE_PUBLISHABLE_KEY": config["ANON_KEY"]}
subprocess.run([npm, "run", "build"], cwd=root / "web-app", env=env, check=True)
subprocess.run(["node", "scripts/start.mjs", "start", "--port", "3000"], cwd=root / "web-app", env=env, check=True)
