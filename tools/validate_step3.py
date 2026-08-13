"""Static checks for STEP 3 when a local Supabase/PostgreSQL runtime is absent."""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "database" / "migrations" / "005_supabase_auth_and_profile.sql"
MIGRATION_HARDENING = ROOT / "database" / "migrations" / "006_supabase_advisor_hardening.sql"
MIGRATION_RPC = ROOT / "database" / "migrations" / "007_profile_rpc_private_boundary.sql"
SEED = ROOT / "database" / "seeds" / "001_beta_lazio_catalogs.sql"
SQL_TEST = ROOT / "database" / "tests" / "002_supabase_auth_profile_contract.sql"
WEB_APP = ROOT / "web-app"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    required_files = (
        MIGRATION,
        MIGRATION_HARDENING,
        MIGRATION_RPC,
        SEED,
        SQL_TEST,
        WEB_APP / "package.json",
        WEB_APP / "package-lock.json",
        WEB_APP / ".env.example",
        WEB_APP / "src" / "App.tsx",
        WEB_APP / "src" / "pages" / "RegisterPage.tsx",
        WEB_APP / "src" / "pages" / "LoginPage.tsx",
        WEB_APP / "src" / "pages" / "ProfilePage.tsx",
    )
    for path in required_files:
        require(path.is_file(), f"File STEP 3 mancante: {path.relative_to(ROOT)}")

    migration = MIGRATION.read_text(encoding="utf-8").lower()
    seed = SEED.read_text(encoding="utf-8").lower()
    hardening = MIGRATION_HARDENING.read_text(encoding="utf-8").lower()
    rpc_migration = MIGRATION_RPC.read_text(encoding="utf-8").lower()
    sql_test = SQL_TEST.read_text(encoding="utf-8").lower()
    register = (WEB_APP / "src" / "pages" / "RegisterPage.tsx").read_text(encoding="utf-8")
    profile = (WEB_APP / "src" / "pages" / "ProfilePage.tsx").read_text(encoding="utf-8")

    require(migration.startswith("begin;"), "La migrazione STEP 3 non apre una transazione")
    require(migration.rstrip().endswith("commit;"), "La migrazione STEP 3 non chiude la transazione")

    for fragment in (
        "references auth.users(id)",
        "create trigger auth_user_created",
        "security definer",
        "set search_path = ''",
        "create or replace function save_fisher_profile",
        "security invoker",
        "alter table app_users force row level security",
        "alter table fishing_trips force row level security",
        "alter view public_fishing_trips set (security_invoker = true)",
        "revoke all on all tables in schema public from public, anon, authenticated",
        "revoke all on all functions in schema public from public, anon, authenticated",
        "profile-photos",
        "file_size_limit",
        "(storage.foldername(name))[1] = (select auth.uid()::text)",
    ):
        require(fragment in migration, f"Contratto Supabase mancante: {fragment}")

    for followup in (hardening, rpc_migration):
        require(followup.startswith("begin;"), "Una migrazione correttiva non apre una transazione")
        require(followup.rstrip().endswith("commit;"), "Una migrazione correttiva non chiude la transazione")

    require("private.recalculate_profile_completion(authenticated_user_id)" not in migration, "La RPC pubblica non deve invocare direttamente lo schema private")
    require("create or replace function save_fisher_profile" in rpc_migration, "Migrazione correttiva RPC mancante")

    require("service_role" not in migration, "La service role non deve essere usata nello schema client")
    require("raw_user_meta_data" in migration, "Il trigger deve leggere i dati iniziali di registrazione")
    require("user_metadata" not in migration, "I metadata non devono autorizzare operazioni")
    require("privacy_accepted" in migration and "terms_accepted" in migration, "Consensi legali non registrati")
    require("beta-0.1-2026-08-13" in seed, "Versione documenti legali non seedata")
    require("auth_user_created" in sql_test, "Il test SQL non verifica il trigger Auth")
    require("relforcerowsecurity" in sql_test, "Il test SQL non verifica FORCE RLS")

    for fragment in ("signUp", "privacy_accepted", "terms_accepted", "adult_confirmed"):
        require(fragment in register, f"Registrazione incompleta: {fragment}")
    for fragment in ("loadCatalogs", "saveProfile", "uploadProfilePhoto", "techniqueIds", "availabilitySlotIds"):
        require(fragment in profile, f"Profilo incompleto: {fragment}")

    print("STEP 3 contract OK: Supabase Auth, legal consent, private photo, profile RPC and deny-by-default RLS declared.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"STEP 3 contract FAILED: {error}", file=sys.stderr)
        raise SystemExit(1) from error
