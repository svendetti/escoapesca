"""Replay esclusivamente nel container locale dedicato; nessun URL remoto accettato."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "supabase_db_functional-test"
OUT = ROOT / "docs/functional-test-2026-11-14"
OUT.mkdir(exist_ok=True)

def sql(text):
    return subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
        input=text, text=True, capture_output=True, encoding="utf-8",
    )

results = []
if "--resume" in sys.argv and (OUT / "replay.json").exists():
    results = [r for r in json.loads((OUT / "replay.json").read_text()) if r["passed"]]
for file in sorted((ROOT / "database/migrations").glob("*.sql")):
    if any(r["file"] == str(file.relative_to(ROOT)) for r in results):
        continue
    result = sql(file.read_text(encoding="utf-8"))
    results.append({"file": str(file.relative_to(ROOT)), "passed": result.returncode == 0, "error": result.stderr if result.returncode else None})
    (OUT / "replay.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(file.name, result.returncode, flush=True)
    if result.returncode:
        print(result.stderr)
        raise SystemExit(1)
    # Nessun worker/provider va richiamato in questo ambiente di collaudo.
    sql("DO $$ BEGIN IF to_regclass('cron.job') IS NOT NULL THEN PERFORM cron.alter_job(jobid, active := false) FROM cron.job; END IF; END $$;")
seed = sql((ROOT / "database/seeds/001_beta_lazio_catalogs.sql").read_text(encoding="utf-8"))
if seed.returncode:
    print(seed.stderr)
    raise SystemExit(1)
tests = []
for file in sorted((ROOT / "database/tests").glob("*.sql")):
    body = file.read_text(encoding="utf-8")
    if file.name.startswith("018_"):
        # Il contratto verifica il flag attivo; renderlo visibile solo alla sua
        # transazione (ROLLBACK finale) non avvia il job nel processo cron.
        body = body.replace("BEGIN;", "BEGIN; SELECT cron.alter_job(jobid, active := true) FROM cron.job WHERE jobname='escoapesca-enqueue-feedback-prompts';", 1)
    result = sql(body)
    tests.append({"file": file.name, "passed": result.returncode == 0, "error": result.stderr if result.returncode else None})
    print(file.name, result.returncode, flush=True)
(OUT / "contracts.json").write_text(json.dumps(tests, indent=2), encoding="utf-8")
raise SystemExit(0 if all(t["passed"] for t in tests) else 1)
