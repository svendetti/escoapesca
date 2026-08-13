"""Static contract checks for the EscoAPesca PostgreSQL schema.

This does not replace executing the migrations on PostgreSQL. It provides a
dependency-free guardrail in workspaces where psql or Docker are unavailable.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATION_CORE = ROOT / "database" / "migrations" / "001_beta_core.sql"
MIGRATION_SECURITY = ROOT / "database" / "migrations" / "002_beta_security_and_metrics.sql"
MIGRATION_INVARIANTS = ROOT / "database" / "migrations" / "003_beta_relational_invariants.sql"
MIGRATION_PERFORMANCE = ROOT / "database" / "migrations" / "004_beta_indexes_and_rls_performance.sql"
MIGRATION_HARDENING = ROOT / "database" / "migrations" / "006_supabase_advisor_hardening.sql"
SEED = ROOT / "database" / "seeds" / "001_beta_lazio_catalogs.sql"
SQL_TEST = ROOT / "database" / "tests" / "001_schema_contract.sql"
ADR = ROOT / "docs" / "architecture" / "0001-beta-data-and-security.md"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def table_block(sql: str, table_name: str) -> str:
    match = re.search(
        rf"CREATE TABLE\s+{re.escape(table_name)}\s*\((.*?)\n\);",
        sql,
        flags=re.IGNORECASE | re.DOTALL,
    )
    require(match is not None, f"Tabella mancante: {table_name}")
    return match.group(1)


def main() -> int:
    paths = (
        MIGRATION_CORE,
        MIGRATION_SECURITY,
        MIGRATION_INVARIANTS,
        MIGRATION_PERFORMANCE,
        MIGRATION_HARDENING,
        SEED,
        SQL_TEST,
        ADR,
    )
    for path in paths:
        require(path.is_file(), f"File mancante: {path.relative_to(ROOT)}")

    core = MIGRATION_CORE.read_text(encoding="utf-8")
    invariants = MIGRATION_INVARIANTS.read_text(encoding="utf-8")
    security = MIGRATION_SECURITY.read_text(encoding="utf-8")
    performance = MIGRATION_PERFORMANCE.read_text(encoding="utf-8")
    hardening = MIGRATION_HARDENING.read_text(encoding="utf-8")
    seed = SEED.read_text(encoding="utf-8")
    sql_test = SQL_TEST.read_text(encoding="utf-8")
    adr = ADR.read_text(encoding="utf-8")

    for name, sql in (
        (MIGRATION_CORE.name, core),
        (MIGRATION_SECURITY.name, security),
        (MIGRATION_INVARIANTS.name, invariants),
        (MIGRATION_PERFORMANCE.name, performance),
        (MIGRATION_HARDENING.name, hardening),
        (SEED.name, seed),
        (SQL_TEST.name, sql_test),
    ):
        require(sql.lstrip().startswith("BEGIN;"), f"{name} non apre una transazione")
        require(
            sql.rstrip().endswith(("COMMIT;", "ROLLBACK;")),
            f"{name} non chiude la transazione",
        )

    expected_tables = {
        "app_users",
        "legal_documents",
        "legal_acceptances",
        "provinces",
        "municipalities",
        "fishing_techniques",
        "availability_slots",
        "fisher_profiles",
        "user_fishing_techniques",
        "user_availability",
        "user_roles",
        "fishing_trips",
        "trip_private_details",
        "trip_participants",
        "trip_feedback",
        "app_events",
        "notifications",
        "admin_actions",
    }
    for table_name in expected_tables:
        table_block(core, table_name)

    users = table_block(core, "app_users").lower()
    require("auth_subject" in users, "app_users deve riferire l'identità esterna")
    require("password" not in users, "app_users non deve contenere password")
    require("is_test" in users, "Manca il flag per escludere gli account di prova")

    trips = table_block(core, "fishing_trips").lower()
    for forbidden in ("exact_lat", "exact_lon", "private_notes", "meeting_point_text"):
        require(forbidden not in trips, f"{forbidden} non deve essere in fishing_trips")
    require(
        "fishing_trips_protected_public_meeting_check" in trips,
        "Manca il vincolo che impedisce il meeting point pubblico nelle uscite protette",
    )

    private_details = table_block(core, "trip_private_details").lower()
    for required in ("meeting_point_text", "exact_lat", "exact_lon", "private_notes"):
        require(required in private_details, f"Campo privato mancante: {required}")

    public_view = re.search(
        r"CREATE VIEW\s+public_fishing_trips.*?COMMENT ON VIEW",
        security,
        flags=re.IGNORECASE | re.DOTALL,
    )
    require(public_view is not None, "Vista public_fishing_trips mancante")
    require(
        "trip_private_details" not in public_view.group(0).lower(),
        "La vista pubblica non deve leggere i dettagli privati",
    )

    security_lower = security.lower()
    for required in (
        "alter table trip_private_details force row level security",
        "trip_private_details_select_authorized",
        "trip.status in ('confirmed', 'completed')",
        "participant.status in ('accepted', 'confirmed', 'completed')",
        "app_events_no_private_spot_payload",
        "notifications_no_private_spot_payload",
        "create view beta_real_fishing_trips",
        "create view beta_metrics",
        "reported_trips",
    ):
        require(required in security_lower, f"Contratto sicurezza/metriche mancante: {required}")

    invariants_lower = invariants.lower()
    for required in (
        "ensure_municipality_matches_province",
        "prevent_organizer_participation",
        "participant.status in ('accepted', 'confirmed', 'completed')",
        "create or replace view beta_trip_outcome_evidence",
    ):
        require(required in invariants_lower, f"Invariante relazionale mancante: {required}")

    performance_lower = performance.lower()
    for required in (
        "notifications_user_idx",
        "trip_feedback_author_idx",
        "alter policy trip_private_details_select_authorized",
        "(select current_app_user_id())",
        "revoke create on schema public from public",
    ):
        require(required in performance_lower, f"Best practice PostgreSQL mancante: {required}")

    hardening_lower = hardening.lower()
    for required in (
        "set search_path = ''",
        "security invoker",
        "public.user_roles",
        "public.municipalities",
        "public.fishing_trips",
        "fishing_trips_province_idx",
    ):

        require(required in hardening_lower, f"Hardening Supabase mancante: {required}")
    expected_techniques = {
        "surfcasting",
        "spinning",
        "bolognese",
        "feeder",
        "carpfishing",
        "ledgering",
        "trout-area",
        "fly-fishing",
        "eging",
        "bolentino",
        "trolling",
        "kayak-fishing",
        "other",
    }
    seeded_techniques = set(
        re.findall(r"\('([a-z0-9-]+)',\s*'[^']+',\s*true,\s*\d+\)", seed)
    )
    require(
        expected_techniques <= seeded_techniques,
        f"Tecniche seed mancanti: {sorted(expected_techniques - seeded_techniques)}",
    )

    for province in ("FR", "LT", "RI", "RM", "VT"):
        require(f"('{province}'," in seed, f"Provincia Lazio mancante: {province}")

    require("beta_real_fishing_trips" in sql_test, "Il test SQL non copre le uscite reali")
    require("relforcerowsecurity" in sql_test, "Il test SQL non verifica FORCE RLS")
    require("non condividerà automaticamente telefono o email" in adr.lower(), "ADR contatti incompleto")

    print(
        "Schema contract OK: "
        f"{len(expected_tables)} tables, "
        f"{len(expected_techniques)} techniques, "
        "private spot isolated, RLS and metrics declared."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"Schema contract FAILED: {error}", file=sys.stderr)
        raise SystemExit(1) from error
