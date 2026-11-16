"""Build and serve against the disposable local stack, without production env."""
import json
import os
import subprocess
import argparse
import ipaddress
import socket
from pathlib import Path

root = Path(__file__).resolve().parents[2]
npm = "npm.cmd" if os.name == "nt" else "npm"
raw = subprocess.check_output([npm, "exec", "--yes", "--package=supabase@3.1.0", "--", "supabase", "status", "--workdir", str(root / "tools/functional-test"), "-o", "json"], text=True)
config = json.loads(raw[raw.index("{"):])
assert config["API_URL"] == "http://127.0.0.1:54321", "Only local API is allowed"
env = {**os.environ, "VITE_SUPABASE_URL": config["API_URL"], "VITE_SUPABASE_PUBLISHABLE_KEY": config["ANON_KEY"]}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--lan-host", help="IPv4 privata assegnata a questo PC, per test su telefono nella stessa Wi-Fi")
args = parser.parse_args()
if args.lan_host:
    try:
        address = ipaddress.IPv4Address(args.lan_host)
    except ipaddress.AddressValueError:
        parser.error("Indicare una IPv4 LAN valida")
    ranges = [ipaddress.ip_network(net) for net in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")]
    if not any(address in net for net in ranges):
        parser.error("Sono ammessi solo indirizzi LAN RFC1918, non host pubblici")
    # A private address is not enough: it must belong to a local interface.
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.bind((str(address), 0))
    except OSError:
        parser.error("L'indirizzo LAN non è assegnato a un'interfaccia di questo PC")
    env["VITE_SUPABASE_URL"] = f"http://{address}:54321"
    print(f"Test LAN: http://{address}:3000 - usare solo account sintetici", flush=True)
subprocess.run([npm, "run", "build"], cwd=root / "web-app", env=env, check=True)
subprocess.run(["node", "scripts/start.mjs", "start", "--port", "3000"], cwd=root / "web-app", env=env, check=True)
