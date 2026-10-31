"""scripts/run_offline_guard.py
Enforces strict offline socket guard blocking all external network connections.
Only loopback (127.0.0.1 / localhost) is permitted.
Runs demo_check and field_test to prove 100% offline autonomy.
"""

import os
import socket
import sys
from pathlib import Path

# Enforce OFFLINE=1 environment
os.environ["OFFLINE"] = "1"

REPO_ROOT = str(Path(__file__).resolve().parents[1])
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# Install strict socket guard
_orig_connect = socket.socket.connect

def guarded_connect(self, address):
    host = address[0] if isinstance(address, tuple) else address
    if host not in ("127.0.0.1", "localhost", "::1"):
        raise RuntimeError(f"[SOCKET GUARD VIOLATION] External connection blocked to {address}")
    return _orig_connect(self, address)

socket.socket.connect = guarded_connect
print("[SOCKET GUARD ACTIVE] External network access strictly blocked. Only loopback allowed.")

# 1. Run demo_check
print("\n--- Running demo_check.py under socket guard ---")
import scripts.demo_check as dc
try:
    dc.run_checks()
    print("[PASS] demo_check.py completed successfully under socket guard.")
except SystemExit as e:
    if e.code != 0:
        print(f"[FAIL] demo_check exited with code {e.code}")
        sys.exit(e.code)

# 2. Run field_test for all 4 regions
print("\n--- Running field_test.py --all under socket guard ---")
import scripts.field_test as ft
try:
    with open(ft.DATA_TESTS_PATH, "r", encoding="utf-8") as f:
        import json
        tests = json.load(f)
    for t in tests:
        ft.run_field_test(t["name"], t["lat"], t["lon"], t["area_ha"])
    print("[PASS] field_test.py --all completed successfully under socket guard.")
except Exception as e:
    print(f"[FAIL] field_test failed: {e}")
    sys.exit(1)

print("\n================================================================")
print("OFFLINE SOCKET GUARD VERIFICATION: 100% SUCCESS")
print("================================================================")
