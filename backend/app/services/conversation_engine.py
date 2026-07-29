"""
Eva's core conversation engine.
Handles the AI personality, grammar correction, vocabulary enrichment,
and context-aware responses.
"""
import json
import re
from typing import Any
from app.services.openai_client import chat_completion
from app.core.logging import get_logger
from app.schemas.session import GrammarCorrection, VocabularyNote

logger = get_logger(__name__)

EVA_SYSTEM_PROMPT = """You are Eva, an AI communication mentor. You help users improve their spoken English, communication skills, confidence, and fluency through natural conversation.

Your personality:
- Warm, patient, encouraging, and professional
- You feel like a real human mentor, never robotic
- You genuinely care about the user's progress
- You are calm, intelligent, and supportive
- You celebrate small wins and stay positive even when correcting mistakes

Your approach to corrections:
- Don't correct every single mistake — focus on patterns and meaningful errors
- When you notice errors, weave the correction naturally into your response
- Example: If user says "I goes to school" → you might say "That's great! I go to school every day too. By the way, we use 'go' with 'I' — 'I go to school'. Let's keep talking!"
- Never make the user feel embarrassed or stupid
- Limit corrections to 1-2 per response maximum
- After 3-4 messages, you may give a brief encouraging note about improvement

Context awareness:
- Remember what was discussed earlier in the conversation
- Build on previous topics naturally
- Ask follow-up questions to keep the conversation flowing
- Adapt your vocabulary complexity to the user's apparent level

Response format:
- Keep responses conversational and natural (2-4 sentences usually)
- Ask an open-ended question at the end when appropriate
- Don't use bullet points or formal formatting in speech
- Speak as you would in a real conversation

IMPORTANT: Return your response as a JSON object with these fields:
{
  "message": "Your conversational response here",
  "corrections": [
    {
      "original": "the incorrect phrase",
      "corrected": "the correct phrase",
      "explanation": "brief friendly explanation",
      "rule": "grammar rule name"
    }
  ],
  "vocabulary": [
    {
      "word": "new word you used",
      "definition": "simple definition",
      "example": "example sentence",
      "difficulty": "easy|medium|hard"
    }
  ]
}

If no corrections needed, return empty array. Include vocabulary only for advanced words you used that the user might not know."""

PRACTICE_SYSTEM_PROMPTS: dict[str, str] = {
    "casual_conversation": "Focus on everyday topics like hobbies, travel, food, culture. Keep it light and fun. Help the user build fluency and natural expression.",
    "storytelling": "Ask the user to tell stories. Help them structure narratives with a beginning, middle, and end. Encourage vivid descriptions and emotional expression.",
    "public_speaking": "Act as an audience. Help the user practice speaking to a group, maintaining eye contact (through the screen), using effective pauses, and varying tone.",
    "debate_practice": "Pick a topic and take the opposite side. Help the user practice constructing arguments, using evidence, and responding to counterpoints calmly.",
    "office_english": "Role-play workplace scenarios: meetings, emails read aloud, presentations, talking to managers or colleagues. Focus on professional language.",
    "travel_english": "Simulate travel scenarios: airport check-in, hotel, restaurant, asking for directions, shopping. Focus on practical, real-world language.",
    "presentation_practice": "Ask the user to present on a topic. Give feedback on structure, delivery, clarity of ideas, and use of transitional phrases.",
    "vocabulary_builder": "Introduce 2-3 new words per exchange in context. Use them naturally and help the user understand and practice them.",
    "grammar_practice": "Focus specifically on grammar. Gently correct more errors than usual. Explain rules clearly. Give targeted grammar exercises in conversation.",
}


async def generate_eva_response(
    user_message: str,
    conversation_history: list[dict[str, str]],
    mode: str = "conversation",
    practice_type: str | None = None,
    user_level: str = "intermediate",
    user_name: str = "there",
) -> dict[str, Any]:
    """
    Generate Eva's response to a user message.
    Returns: { message, corrections, vocabulary }
    """
    # Build system prompt
    system = EVA_SYSTEM_PROMPT
    if mode == "practice" and practice_type and practice_type in PRACTICE_SYSTEM_PROMPTS:
        system += f"\n\nCurrent practice mode: {PRACTICE_SYSTEM_PROMPTS[practice_type]}"
    system += f"\n\nUser's English level: {user_level}"
    system += f"\nAddress the user as '{user_name}' occasionally (not every message)."

    # Trim history to last 12 messages to stay within context
    trimmed_history = conversation_history[-12:]

    messages = [
        {"role": "system", "content": system},
        *trimmed_history,
        {"role": "user", "content": user_message},
    ]

    try:
        raw = await chat_completion(messages, temperature=0.85, max_tokens=600)
        return _parse_eva_response(raw)
    except Exception as e:
        logger.error(f"Eva conversation engine error: {e}")
        return _fallback_response()


def _parse_eva_response(raw: str) -> dict[str, Any]:
    """Parse the JSON response from Eva, handling malformed output gracefully."""
    # Try to extract JSON from the response
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group())
            corrections = [
                GrammarCorrection(**c).model_dump()
                for c in (data.get("corrections") or [])
                if isinstance(c, dict) and all(k in c for k in ["original", "corrected", "explanation", "rule"])
            ]
            vocabulary = [
                VocabularyNote(**v).model_dump()
                for v in (data.get("vocabulary") or [])
                if isinstance(v, dict) and all(k in v for k in ["word", "definition", "example"])
            ]
            return {
                "message": data.get("message", raw),
                "corrections": corrections,
                "vocabulary": vocabulary,
            }
        except (json.JSONDecodeError, ValueError):
            pass

    # Fallback: return raw as message
    return {"message": raw, "corrections": [], "vocabulary": []}


def _fallback_response() -> dict[str, Any]:
    return {
        "message": "I'm here with you! Could you tell me a bit more about what you'd like to practice today? I'm all ears.",
        "corrections": [],
        "vocabulary": [],
    }


async def analyze_session_performance(
    messages: list[dict[str, str]],
    mode: str,
    role: str | None = None,
) -> dict[str, Any]:
    """
    Analyze a full conversation session and generate scores + feedback.
    """
    if not messages:
        return _default_scores()

    user_messages = [m["content"] for m in messages if m["role"] == "user"]
    if not user_messages:
        return _default_scores()

    conversation_text = "\n".join(
        f"{'User' if m['role'] == 'user' else 'Eva'}: {m['content']}"
        for m in messages[-20:]  # analyze last 20 messages
    )

    prompt = f"""Analyze this English conversation and provide scores and feedback.
    
Conversation:
{conversation_text}

Provide a JSON response with:
{{
  "scores": {{
    "grammar": <0-100>,
    "vocabulary": <0-100>,
    "fluency": <0-100>,
    "confidence": <0-100>,
    "communication": <0-100>,
    "pronunciation": <0-100>,
    "overall": <0-100>
  }},
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["area 1", "area 2", "area 3"],
  "suggestions": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "summary": "2-3 sentence overall assessment"
}}

Base scores on: grammar accuracy, vocabulary range, sentence fluency, confidence shown, communication clarity.
Be fair and constructive. Scores should reflect the actual quality visible in the conversation."""

    try:
        raw = await chat_completion(
            [{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=800,
        )
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return data
    except Exception as e:
        logger.error(f"Session analysis error: {e}")

    return _default_scores()


def _default_scores() -> dict[str, Any]:
    return {
        "scores": {
            "grammar": 70, "vocabulary": 68, "fluency": 72,
            "confidence": 70, "communication": 71, "pronunciation": 68, "overall": 70
        },
        "strengths": ["Engaged in conversation", "Made effort to communicate"],
        "improvements": ["Continue practicing regularly"],
        "suggestions": ["Try the Daily Practice feature for targeted improvement"],
        "summary": "Good session! Keep practicing to continue improving."
    }
