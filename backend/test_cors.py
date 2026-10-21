"""Test CORS headers on all relevant responses."""
import sys
sys.path.insert(0, ".")

from starlette.testclient import TestClient
import main as m

client = TestClient(m.app, raise_server_exceptions=False)

ORIGIN = "http://localhost:5173"

print("=" * 55)
print("CORS Test — EVA Backend")
print("=" * 55)

# 1. Preflight OPTIONS
print("\n1. OPTIONS preflight /api/auth/google")
r = client.options(
    "/api/auth/google",
    headers={
        "Origin": ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    },
)
print(f"   Status : {r.status_code}")
acao = r.headers.get("access-control-allow-origin", "MISSING")
acac = r.headers.get("access-control-allow-credentials", "MISSING")
print(f"   ACAO   : {acao}")
print(f"   ACAC   : {acac}")
preflight_ok = acao == ORIGIN and acac == "true"
print(f"   Result : {'PASS' if preflight_ok else 'FAIL'}")

# 2. POST with bad token → 401 error response must also carry CORS headers
print("\n2. POST /api/auth/google (bad token → error response)")
r2 = client.post(
    "/api/auth/google",
    json={"credential": "bad_token"},
    headers={"Origin": ORIGIN, "Content-Type": "application/json"},
)
print(f"   Status : {r2.status_code}")
acao2 = r2.headers.get("access-control-allow-origin", "MISSING")
print(f"   ACAO   : {acao2}")
error_cors_ok = acao2 == ORIGIN
print(f"   Result : {'PASS' if error_cors_ok else 'FAIL — error responses missing CORS headers'}")

# 3. Health check (no auth needed)
print("\n3. GET /health")
r3 = client.get("/health", headers={"Origin": ORIGIN})
print(f"   Status : {r3.status_code}")
acao3 = r3.headers.get("access-control-allow-origin", "MISSING")
print(f"   ACAO   : {acao3}")
print(f"   Result : {'PASS' if acao3 == ORIGIN else 'FAIL'}")

print("\n" + "=" * 55)
all_ok = preflight_ok and error_cors_ok
print(f"Overall: {'ALL PASS' if all_ok else 'FAILURES DETECTED — see above'}")
print("=" * 55)
