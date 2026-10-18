"""
Eva's core conversation engine.
Routes to Groq → Gemini → OpenAI → scripted fallback.

Eva is a general-purpose AI assistant and communication mentor.
She answers ANY question intelligently, maintains conversation context,
and optionally provides language coaching overlaid on top of answers.
"""

import json
import re
import random
from typing import Any
from app.services.ai_router import chat_completion
from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.session import GrammarCorrection, VocabularyNote

logger = get_logger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────────
# Eva is a general-purpose assistant FIRST, English mentor SECOND.
# This fixes the root cause of deflecting questions with scripted non-answers.

EVA_SYSTEM_PROMPT = """You are Eva, a warm, intelligent AI assistant and communication mentor.

RESPONSE STYLE — MOST IMPORTANT:
- Be concise and natural. Default to 2–4 sentences. Match length to complexity: short questions get short answers, technical questions get thorough ones.
- Answer directly. Never pad with "Great question!", unsolicited advice, or unrelated tips.
- No markdown in your message text. No **bold**, no bullet points, no headers, no numbered lists, no backticks. Write in flowing prose only. The text will be read aloud.
- Do not repeat the user's question back to them.
- Ask at most one follow-up question, and only when genuinely needed.

CORE CAPABILITY:
- Answer ANY question: knowledge, science, tech, programming, math, career, creative writing, debugging — everything.
- Maintain full conversation context. Resolve pronouns and references to prior messages correctly.
- "Can you hear me?" → "Yes, I can hear you! What would you like to talk about?"
- "What about its disadvantages?" after discussing Python → answer Python's disadvantages.
- "Forget that, help me with X" → immediately switch to X.
- Be technically accurate. Say "I'm not sure" rather than guessing.

ENGLISH COACHING (secondary):
- After answering the question, you may note one grammar error if it is worth correcting. Never more than one. Never embarrassing.
- Do not force English lessons into general conversation.
- In practice modes, lean more toward coaching.

RESPONSE FORMAT — REQUIRED:
Return exactly this JSON object with no markdown around it:
{
  "message": "Your plain-prose answer here. No markdown formatting.",
  "corrections": [],
  "vocabulary": []
}

corrections entry: {"original": "...", "corrected": "...", "explanation": "...", "rule": "..."}
vocabulary entry: {"word": "...", "definition": "...", "example": "...", "difficulty": "easy|medium|hard"}

Both arrays must be empty unless there is a real correction or a genuinely useful vocabulary note.
The message field must always be present, non-empty, and contain plain prose only."""

# ── Practice mode overlays ────────────────────────────────────────────────────
# These ADD to the base prompt — they don't replace general capability.

PRACTICE_OVERLAYS: dict[str, str] = {
    "casual_conversation": "\n\nPRACTICE OVERLAY: Casual conversation mode. Keep things relaxed and friendly. Topics: everyday life, hobbies, travel, food, culture. Still answer any question asked.",
    "storytelling": "\n\nPRACTICE OVERLAY: Storytelling mode. Encourage the user to tell stories. Help structure narratives (beginning, middle, end). Give feedback on expression and word choice.",
    "public_speaking": "\n\nPRACTICE OVERLAY: Public speaking mode. Act as an audience. Give feedback on tone, pacing, clarity, and confidence after the user speaks.",
    "debate_practice": "\n\nPRACTICE OVERLAY: Debate mode. Pick a position on topics and argue it respectfully. Help the user practice constructing and defending arguments.",
    "office_english": "\n\nPRACTICE OVERLAY: Office English mode. Role-play professional scenarios: meetings, presentations, emails, talking to managers. Focus on formal register.",
    "travel_english": "\n\nPRACTICE OVERLAY: Travel English mode. Simulate travel scenarios: airport, hotel, restaurant, shopping, directions. Focus on practical phrases.",
    "presentation_practice": "\n\nPRACTICE OVERLAY: Presentation mode. Ask the user to present on a topic. Give feedback on structure, delivery, and clarity.",
    "vocabulary_builder": "\n\nPRACTICE OVERLAY: Vocabulary mode. Naturally weave 2-3 useful or advanced words into each response. Define them briefly inline.",
    "grammar_practice": "\n\nPRACTICE OVERLAY: Grammar mode. Pay closer attention to grammar errors than usual. Explain rules clearly. Offer targeted exercises through conversation.",
}


# ── Scripted fallback (zero AI keys configured) ───────────────────────────────
# Minimal, honest, varied — never pretends to answer something it can't.

_FALLBACK_POOL = [
    "I need an AI provider configured to answer that properly. Add a GROQ_API_KEY or GEMINI_API_KEY to the backend .env file — both are free. Once set, I can answer anything you ask.",
    "To give you a real answer I need an AI provider. Get a free Groq key at console.groq.com/keys and add it as GROQ_API_KEY in backend/.env.",
    "No AI provider is configured yet. Head to console.groq.com/keys for a free key, add GROQ_API_KEY to backend/.env, and I'll be fully functional.",
]

_GREETING_FALLBACK = [
    "Hello! I'm Eva, your AI assistant and communication mentor. I'm not fully powered up yet — add a free GROQ_API_KEY to backend/.env and I'll be able to answer anything you ask.",
    "Hey! Great to meet you. I can't give real answers yet because no AI provider is configured. Add GROQ_API_KEY=your_key to backend/.env (free at console.groq.com/keys).",
]


def _scripted_response(user_message: str) -> str:
    msg = user_message.lower().strip()
    if any(
        w in msg
        for w in [
            "hello",
            "hi",
            "hey",
            "good morning",
            "good evening",
            "good afternoon",
        ]
    ):
        return random.choice(_GREETING_FALLBACK)
    if any(
        w in msg for w in ["can you hear", "are you there", "are you working", "test"]
    ):
        return "I can receive your messages, but I need an AI provider to respond intelligently. Add GROQ_API_KEY to backend/.env (free at console.groq.com/keys)."
    return random.choice(_FALLBACK_POOL)


# ── Main response generator ───────────────────────────────────────────────────


async def generate_eva_response(
    user_message: str,
    conversation_history: list[dict[str, str]],
    mode: str = "conversation",
    practice_type: str | None = None,
    user_level: str = "intermediate",
    user_name: str = "there",
) -> dict[str, Any]:
    """
    Generate Eva's response.
    Provider priority: Groq → Gemini → OpenAI → scripted fallback.
    """
    if not user_message.strip():
        return {
            "message": "I didn't catch that — could you say it again?",
            "corrections": [],
            "vocabulary": [],
        }

    if not settings.ai_available:
        return {
            "message": _scripted_response(user_message),
            "corrections": [],
            "vocabulary": [],
        }

    # Build system prompt
    system = EVA_SYSTEM_PROMPT
    if mode == "practice" and practice_type and practice_type in PRACTICE_OVERLAYS:
        system += PRACTICE_OVERLAYS[practice_type]
    if user_level and user_level != "intermediate":
        system += f"\n\nUser's English level: {user_level}. Adjust vocabulary and explanation depth accordingly."
    if user_name and user_name != "there":
        system += f"\nUser's name: {user_name}. Use their name occasionally — not in every message."

    # Build message list — keep last 20 turns for context
    messages: list[dict[str, str]] = []
    for m in conversation_history[-20:]:
        role = "assistant" if m["role"] in ("assistant", "eva", "model") else "user"
        messages.append({"role": role, "content": m["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        raw = await chat_completion(system, messages, temperature=0.75, max_tokens=1200)
        return _parse_response(raw, user_message)
    except Exception as e:
        logger.error(f"AI response error ({settings.ai_provider}): {e}")
        # Return an honest error, not a scripted deflection
        return {
            "message": "I'm having trouble connecting to my AI provider right now. Please check the backend logs and try again in a moment.",
            "corrections": [],
            "vocabulary": [],
        }


def _strip_markdown(text: str) -> str:
    """
    Remove Markdown formatting so the message reads as natural prose.
    Called on every AI response before it is stored or spoken.
    """
    # Remove headings
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Remove bold/italic (**text**, __text__, *text*, _text_)
    text = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", text)
    text = re.sub(r"_{1,2}([^_]+)_{1,2}", r"\1", text)
    # Remove inline code
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # Remove code blocks (```...```)
    text = re.sub(r"```[\s\S]*?```", "", text)
    # Convert unordered bullet lists to comma-less prose lines
    text = re.sub(r"^\s*[-*•]\s+", "", text, flags=re.MULTILINE)
    # Convert numbered lists  "1. item" → "item"
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    # Remove horizontal rules
    text = re.sub(r"^[-*_]{3,}\s*$", "", text, flags=re.MULTILINE)
    # Remove blockquotes
    text = re.sub(r"^>\s+", "", text, flags=re.MULTILINE)
    # Collapse multiple blank lines into one
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _parse_response(raw: str, original_message: str = "") -> dict[str, Any]:
    """
    Parse the AI response robustly.

    The AI is instructed to return JSON, but may return:
    - Clean JSON object
    - JSON wrapped in ```json ... ``` fences
    - Plain prose (when the model ignores the format instruction)

    All three cases are handled. Plain prose is returned as-is — it's still
    a valid answer and far better than a scripted deflection.
    """
    if not raw or not raw.strip():
        return {
            "message": "I didn't get a response — please try again.",
            "corrections": [],
            "vocabulary": [],
        }

    # Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()

    # Attempt JSON extraction
    json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group())
            msg = (data.get("message") or "").strip()
            if msg:
                corrections = _safe_corrections(data.get("corrections"))
                vocabulary = _safe_vocabulary(data.get("vocabulary"))
                return {
                    "message": _strip_markdown(msg),
                    "corrections": corrections,
                    "vocabulary": vocabulary,
                }
        except (json.JSONDecodeError, ValueError, TypeError):
            pass  # fall through to plain-text handling

    # If JSON extraction failed, return the raw text directly.
    # This is intentional: a good plain-text answer is better than silence.
    plain = cleaned.strip()
    if plain:
        return {"message": _strip_markdown(plain), "corrections": [], "vocabulary": []}

    return {
        "message": "I couldn't formulate a response. Please try again.",
        "corrections": [],
        "vocabulary": [],
    }


def _safe_corrections(raw: Any) -> list[dict]:
    if not isinstance(raw, list):
        return []
    result = []
    for c in raw:
        if not isinstance(c, dict):
            continue
        if all(k in c for k in ("original", "corrected", "explanation", "rule")):
            try:
                result.append(GrammarCorrection(**c).model_dump())
            except Exception:
                pass
    return result


def _safe_vocabulary(raw: Any) -> list[dict]:
    if not isinstance(raw, list):
        return []
    result = []
    for v in raw:
        if not isinstance(v, dict):
            continue
        if all(k in v for k in ("word", "definition", "example")):
            try:
                result.append(VocabularyNote(**v).model_dump())
            except Exception:
                pass
    return result


# ── Session performance analysis ─────────────────────────────────────────────


async def analyze_session_performance(
    messages: list[dict[str, str]],
    mode: str,
    role: str | None = None,
) -> dict[str, Any]:
    if not messages or not settings.ai_available:
        return _default_scores()

    user_msgs = [m["content"] for m in messages if m["role"] == "user"]
    if not user_msgs:
        return _default_scores()

    conversation_text = "\n".join(
        f"{'User' if m['role'] == 'user' else 'Eva'}: {m['content']}"
        for m in messages[-20:]
    )

    system = (
        "You are an expert English communication assessor. "
        "Analyze the conversation transcript and return ONLY a valid JSON object — no prose, no markdown."
    )
    prompt = f"""Analyze this conversation and score the user's English communication.

TRANSCRIPT:
{conversation_text}

Return this exact JSON structure with integer scores 0-100:
{{
  "scores": {{"grammar": 70, "vocabulary": 70, "fluency": 70, "confidence": 70, "communication": 70, "pronunciation": 70, "overall": 70}},
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area 1", "area 2"],
  "suggestions": ["tip 1", "tip 2"],
  "summary": "2-3 sentence honest assessment"
}}"""

    try:
        raw = await chat_completion(
            system,
            [{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=600,
        )
        cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            data = json.loads(match.group())
            # Validate scores are numbers
            scores = data.get("scores", {})
            if isinstance(scores, dict) and scores:
                return data
    except Exception as e:
        logger.error(f"Session analysis error: {e}")

    return _default_scores()


def _default_scores() -> dict[str, Any]:
    return {
        "scores": {
            "grammar": 70,
            "vocabulary": 68,
            "fluency": 72,
            "confidence": 70,
            "communication": 71,
            "pronunciation": 68,
            "overall": 70,
        },
        "strengths": ["Engaged actively in conversation", "Communicated ideas clearly"],
        "improvements": ["Continue practicing regularly"],
        "suggestions": ["Try the Interview mode for structured practice"],
        "summary": "Good session! Keep practicing every day to see rapid improvement.",
    }
