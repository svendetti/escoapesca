"""Account sintetici e richieste dirette: solo Supabase su loopback."""
import datetime as dt
import json
import os
import subprocess
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/functional-test-2026-11-14/api-cycle.json"
raw = subprocess.check_output(["npm.cmd" if os.name == "nt" else "npm", "exec", "--yes", "--package=supabase@3.1.0", "--", "supabase", "status", "--workdir", str(ROOT / "tools/functional-test"), "-o", "json"], text=True)
config = json.loads(raw[raw.index("{"):])
base = config["API_URL"]
assert base in ("http://127.0.0.1:54321", "http://localhost:54321"), "Remote forbidden"
key = config["ANON_KEY"]
results = []

def call(path, token=None, body=None, method=None):
    req = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None,
        headers={"apikey": key, "Authorization": "Bearer " + (token or key), "Content-Type": "application/json", "Prefer": "return=representation"}, method=method or ("POST" if body is not None else "GET"))
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = response.read()
            return response.status, json.loads(data) if data else None
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())

def check(name, condition, evidence=None):
    results.append({"test": name, "passed": bool(condition), "evidence": evidence})
    OUT.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(name, bool(condition), flush=True)
    if not condition:
        raise RuntimeError(name)

def rpc(name, token, args):
    status, data = call("/rest/v1/rpc/" + name, token, args)
    if status >= 300:
        raise RuntimeError(f"{name}: {status} {data}")
    return data

def local_sql(statement):
    return subprocess.run(["docker", "exec", "supabase_db_functional-test", "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], check=True, capture_output=True, text=True).stdout.strip()

stamp = uuid.uuid4().hex[:10]
users = []
for role in ["organizer", "participant", "capacity-probe"]:
    status, data = call("/auth/v1/signup", body={"email": f"qa-{role}-{stamp}@example.invalid", "password": "Synthetic-QA-Only-2030!", "data": {"display_name": "QA " + role, "province_code": "RM", "municipality_name": "Roma", "age_band": "25_34", "adult_confirmed": True, "privacy_accepted": True, "terms_accepted": True}})
    registered_user = data.get("user", data)
    check("signup " + role, status == 200 and bool(registered_user.get("id")), {"status": status})
    if not data.get("access_token"):
        # Token digest from this disposable local DB only; never log it.
        uid = registered_user["id"]
        digest = local_sql(f"SELECT confirmation_token FROM auth.users WHERE id='{uid}'")
        status, data = call("/auth/v1/verify", body={"token_hash": digest, "type": "email"})
        check("email confirmation API " + role, status == 200 and bool(data.get("access_token")))
    token = data["access_token"]
    users.append((data["user"]["id"], token))
    rpc("save_fisher_profile", token, {"p_display_name": "QA " + role, "p_province_code": "RM", "p_municipality_name": "Roma", "p_generic_zone": "Zona sintetica", "p_age_band": "25_34", "p_bio": "Solo test locale", "p_water_type": "both", "p_skill_level": "intermediate", "p_travel_radius_km": 25, "p_technique_ids": [1], "p_availability_slot_ids": [1]})
    check("onboarding " + role, True)
(org, ot), (part, pt), (probe, probe_token) = users
now = dt.datetime.now(dt.timezone.utc)

def trip():
    status, data = call("/rest/v1/fishing_trips", ot, {"organizer_user_id": org, "title": "Uscita sintetica QA", "technique_id": 1, "water_type": "sea", "starts_at": (now + dt.timedelta(days=2)).isoformat(), "ends_at": (now + dt.timedelta(days=2, hours=4)).isoformat(), "province_code": "RM", "public_zone": "Zona test", "max_participants": 2, "recommended_level": "any", "description": "Solo collaudo isolato", "trip_type": "protected", "status": "open"})
    check("create trip", status == 201)
    return data[0]["id"]

tid = trip()
status, data = call("/rest/v1/trip_private_details", ot, {"trip_id": tid, "meeting_point_text": "Incontro sintetico", "exact_lat": 41.9, "exact_lon": 12.5})
check("save private details", status == 201)
private_path = "/rest/v1/trip_private_details?select=trip_id&trip_id=eq." + tid
check("private denied before request", call(private_path, pt)[1] == [])
status, data = call("/rest/v1/rpc/search_fishing_trips", pt, {"p_limit": 50})
check("discovery", status == 200 and any(t["id"] == tid for t in data))
request = rpc("request_trip_participation", pt, {"p_trip_id": tid, "p_request_message": "Messaggio sintetico"})[0]
check("request", request["participation_status"] == "requested")
rpc("decide_trip_participation", ot, {"p_participant_id": request["participant_id"], "p_decision": "accepted"})
check("accepted cannot read private", call(private_path, pt)[1] == [])
check("capacity exhausted", rpc("get_public_fishing_trip", pt, {"p_trip_id": tid})[0]["available_places"] == 0)
rpc("confirm_fishing_trip", ot, {"p_trip_id": tid})
check("active group readable", len(rpc("list_trip_group_members", pt, {"p_trip_id": tid})) == 2)
check("confirmed can read private", len(call(private_path, pt)[1]) == 1)
check("account isolation", call("/rest/v1/fisher_profiles?select=user_id&user_id=eq." + org, pt)[1] == [])
race = trip()
requests = [rpc("request_trip_participation", token, {"p_trip_id": race})[0] for token in [pt, probe_token]]
status, denied = call("/rest/v1/rpc/decide_trip_participation", pt, {"p_participant_id": requests[0]["participant_id"], "p_decision": "accepted"})
check("non-organizer decision denied", status == 403 and denied.get("code") == "42501")
with ThreadPoolExecutor(max_workers=2) as pool:
    decisions = list(pool.map(lambda req: call("/rest/v1/rpc/decide_trip_participation", ot, {"p_participant_id": req["participant_id"], "p_decision": "accepted"}), requests))
check("concurrent last place", sum(status == 200 for status, _ in decisions) == 1, {"statuses": [status for status, _ in decisions]})
check("one reserved place after concurrency", sum(r["participation_status"] == "accepted" for r in rpc("list_trip_participation_requests", ot, {"p_trip_id": race})) == 1)

# Local outbox only: no Edge Function or push provider is called.
subscription = {"p_endpoint": f"https://fcm.googleapis.com/wp/local-qa-{stamp}", "p_p256dh": "A" * 65, "p_auth_secret": "B" * 24}
rpc("upsert_my_push_subscription", pt, subscription)
notification = rpc("send_test_push_notification", pt, {})
rpc("upsert_my_push_subscription", ot, subscription)
local_sql("BEGIN; SET LOCAL request.jwt.claim.role='service_role'; SELECT count(*) FROM public.claim_push_deliveries(50); COMMIT;")
state = local_sql(f"SELECT status FROM public.push_outbox WHERE notification_id='{notification}'")
check("old account push is never claimed for new device owner", state == "failed")
for action in ["rejected", "cancelled"]:
    other = trip()
    request = rpc("request_trip_participation", pt, {"p_trip_id": other})[0]
    if action == "rejected":
        result = rpc("decide_trip_participation", ot, {"p_participant_id": request["participant_id"], "p_decision": action})
    else:
        result = rpc("cancel_trip_participation", pt, {"p_trip_id": other})
    check(action, result[0]["participation_status"] == action)
    if action == "cancelled":
        status, data = call("/rest/v1/fishing_trips?id=eq." + other, ot,
            {"status": "cancelled", "cancelled_at": now.isoformat(), "cancellation_reason": "Annullamento sintetico"}, method="PATCH")
        check("organizer cancellation", status == 200 and data[0]["status"] == "cancelled")
local_sql(f"UPDATE public.fishing_trips SET starts_at=now()-interval '8 hours', ends_at=now()-interval '4 hours' WHERE id='{tid}'")
for token in [ot, pt]:
    rpc("submit_trip_feedback", token, {"p_trip_id": tid, "p_trip_happened": True, "p_met_new_fisher": True, "p_would_repeat": True, "p_rating": 5, "p_comment": "Feedback sintetico"})
    check("feedback", True)
status, data = call("/auth/v1/logout?scope=local", pt, {})
check("logout participant", status == 204)
status, data = call("/auth/v1/token?grant_type=password", body={"email": f"qa-participant-{stamp}@example.invalid", "password": "Synthetic-QA-Only-2030!"})
check("login after account switch", status == 200 and data["user"]["id"] == part)
pt = data["access_token"]
local_sql(f"UPDATE public.app_users SET status='disabled',disabled_at=now() WHERE id='{part}'")
check("disabled private access revoked", call(private_path, pt)[1] == [])
status, data = call("/rest/v1/rpc/list_trip_group_members", pt, {"p_trip_id": tid})
check("disabled group access revoked", status == 403 and data.get("code") == "42501", {"status": status, "code": data.get("code") if isinstance(data, dict) else None})
