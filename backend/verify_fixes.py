"""Quick smoke-test for all backend fixes. Run from backend/ directory."""
import sys, json
sys.path.insert(0, ".")

print("=" * 50)
print("EVA Backend — Smoke Test")
print("=" * 50)

# ── Imports ────────────────────────────────────────────────────────────────────
from app.core.config import settings
from app.schemas.user import UserResponse, UserStats, UserSettings
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.services.conversation_engine import generate_eva_response, _parse_response
from app.services.ai_router import chat_completion
print("[PASS] All module imports OK")

# ── Config ─────────────────────────────────────────────────────────────────────
print(f"       ai_provider   : {settings.ai_provider}")
print(f"       ai_available  : {settings.ai_available}")
print(f"       groq_key_set  : {bool(settings.groq_api_key)}")
print(f"       gemini_key_set: {bool(settings.gemini_api_key)}")
print(f"       openai_key_set: {bool(settings.openai_api_key)}")

# ── camelCase serialisation ────────────────────────────────────────────────────
stats = UserStats(
    total_sessions=5,
    current_streak=3,
    words_learned=42,
    average_score=78.5,
    sessions_this_week=2,
    total_speaking_minutes=90,
    longest_streak=7,
)
d = stats.model_dump(by_alias=True)
assert "totalSessions"    in d, "FAIL: totalSessions missing"
assert "currentStreak"    in d, "FAIL: currentStreak missing"
assert "wordsLearned"     in d, "FAIL: wordsLearned missing"
assert "averageScore"     in d, "FAIL: averageScore missing"
assert "total_sessions" not in d, "FAIL: snake_case still present"
print("[PASS] camelCase serialisation — UserStats keys:", list(d.keys()))

# ── _parse_response: plain text ────────────────────────────────────────────────
plain = "Yes, I can hear you clearly! What would you like to talk about?"
r1 = _parse_response(plain)
assert r1["message"] == plain, f"FAIL: got {r1['message']!r}"
assert r1["corrections"] == [], "FAIL: corrections not empty"
print("[PASS] _parse_response handles plain text")

# ── _parse_response: valid JSON ────────────────────────────────────────────────
raw_json = json.dumps({
    "message": "Python is a high-level programming language.",
    "corrections": [],
    "vocabulary": [{"word": "high-level", "definition": "abstracted from hardware", "example": "Python is high-level.", "difficulty": "easy"}],
})
r2 = _parse_response(raw_json)
assert r2["message"] == "Python is a high-level programming language.", f"FAIL: {r2['message']!r}"
assert len(r2["vocabulary"]) == 1, "FAIL: vocabulary missing"
print("[PASS] _parse_response handles JSON with vocabulary")

# ── _parse_response: JSON wrapped in code fences ───────────────────────────────
fenced = '```json\n{"message": "Hello there!", "corrections": [], "vocabulary": []}\n```'
r3 = _parse_response(fenced)
assert r3["message"] == "Hello there!", f"FAIL: {r3['message']!r}"
print("[PASS] _parse_response strips markdown code fences")

# ── _parse_response: empty input ───────────────────────────────────────────────
r4 = _parse_response("")
assert r4["message"], "FAIL: empty input gave empty message"
print("[PASS] _parse_response handles empty input")

# ── _scripted_response when no AI ─────────────────────────────────────────────
from app.services.conversation_engine import _scripted_response
r5 = _scripted_response("can you hear me")
assert "GROQ_API_KEY" in r5 or "Groq" in r5 or "provider" in r5.lower(), f"FAIL: unexpected fallback: {r5!r}"
print("[PASS] _scripted_response honest about missing API key")

print()
print("=" * 50)
print("All smoke tests PASSED")
print("=" * 50)
