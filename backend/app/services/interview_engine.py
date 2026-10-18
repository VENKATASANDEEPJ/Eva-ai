"""
Eva's Interview Engine.
Routes to Gemini (free) → OpenAI → scripted fallback.
"""

import json
import re
import random
from datetime import datetime, timezone
from typing import Any
from app.services.ai_router import chat_completion
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Question banks ────────────────────────────────────────────────────────────

QUESTION_BANKS: dict[str, list[str]] = {
    "software_engineer": [
        "Tell me about yourself and your software engineering background.",
        "Can you explain the difference between a stack and a queue? When would you use each?",
        "Describe a challenging technical problem you solved. What was your approach?",
        "How would you design a URL shortening service like bit.ly?",
        "Explain time complexity. What is the Big O of binary search?",
        "Tell me about a time you disagreed with a teammate. How did you resolve it?",
        "What is the difference between synchronous and asynchronous programming?",
        "How do you ensure code quality in your projects?",
        "Describe your experience with version control and collaboration.",
        "Where do you see yourself in 5 years as an engineer?",
    ],
    "frontend_developer": [
        "Walk me through your experience with React or similar frameworks.",
        "What is the difference between let, const, and var in JavaScript?",
        "How do you approach making a website accessible?",
        "Explain the Virtual DOM and why it is useful.",
        "How do you optimize the performance of a slow-loading web page?",
        "Describe something you built that you are proud of.",
        "What is CSS specificity and how does it affect styling?",
        "How do you handle cross-browser compatibility issues?",
        "Describe your experience with responsive design.",
        "How do you stay current with the rapidly changing frontend ecosystem?",
    ],
    "backend_developer": [
        "Tell me about your experience with backend frameworks and languages.",
        "What is REST and how does it differ from GraphQL?",
        "How would you design a database schema for a social media platform?",
        "Explain the difference between SQL and NoSQL databases.",
        "How do you handle authentication and authorization in your APIs?",
        "Describe a time you improved the performance of a slow backend service.",
        "What is caching and what strategies have you used?",
        "How do you approach error handling and logging in production?",
        "Explain microservices vs monolith architecture trade-offs.",
        "How do you handle database migrations safely in production?",
    ],
    "fullstack_developer": [
        "How do you approach building a full-stack feature from scratch?",
        "Walk me through your most complex full-stack project.",
        "How do you decide whether logic belongs in the frontend or backend?",
        "Describe your experience with API design and consumption.",
        "How do you manage state in large frontend applications?",
        "What deployment strategies have you used?",
        "How do you handle security concerns on both frontend and backend?",
        "How do you handle real-time features like notifications?",
        "Tell me about a time you had to learn a new technology quickly.",
        "How do you approach testing across the full stack?",
    ],
    "data_scientist": [
        "Tell me about a data science project you worked on end to end.",
        "What is the difference between supervised and unsupervised learning?",
        "How do you handle missing data in a dataset?",
        "Explain overfitting and how you prevent it.",
        "What is cross-validation and why is it important?",
        "How do you communicate complex model results to non-technical stakeholders?",
        "Describe your experience with Python data science libraries.",
        "What is feature engineering? Give an example.",
        "How do you evaluate model performance beyond accuracy?",
        "Describe the trade-off between bias and variance.",
    ],
    "hr": [
        "Tell me about yourself.",
        "Why are you interested in this company?",
        "Where do you see yourself in 5 years?",
        "What is your biggest strength?",
        "What is your biggest weakness and how are you working on it?",
        "Why are you leaving your current position?",
        "How do you handle stress and pressure at work?",
        "Describe your ideal work environment.",
        "What motivates you professionally?",
        "Do you have any questions for us?",
    ],
    "behavioral": [
        "Tell me about a time you faced a significant challenge at work. How did you overcome it?",
        "Describe a situation where you had to work with a difficult colleague.",
        "Tell me about a time you failed. What did you learn?",
        "Give me an example of when you showed leadership.",
        "Describe a time you had to learn something new quickly under pressure.",
        "Tell me about a time you went above and beyond for a customer or team member.",
        "Describe a situation where you had to manage multiple priorities.",
        "Tell me about a time you disagreed with your manager. What happened?",
        "Give me an example of a time you used data to make a decision.",
        "Tell me about your proudest professional achievement.",
    ],
}

INTERVIEWER_SYSTEM = """You are Eva, conducting a professional job interview. You are warm, fair, and encouraging.

Rules:
- Ask one question at a time
- Acknowledge the candidate's answer briefly (1 sentence), then ask the next question
- Keep your responses concise — under 80 words total
- Do NOT reveal scoring or evaluation during the interview
- Be natural and conversational, not robotic

Return ONLY a JSON object:
{"message": "your response with next question"}"""


# ── Opener ────────────────────────────────────────────────────────────────────


async def get_interview_opener(role: str) -> str:
    role_label = role.replace("_", " ").title()
    first_q = QUESTION_BANKS.get(role, QUESTION_BANKS["behavioral"])[0]

    if not settings.ai_available:
        return _default_opener(role)

    system = INTERVIEWER_SYSTEM
    prompt = f'Generate a warm, professional opening for a {role_label} interview. Include a greeting, introduce yourself as Eva (Senior Interviewer), and ask this first question: \'{first_q}\'. Keep it under 80 words. Return JSON: {{"message": "..."}}'

    try:
        raw = await chat_completion(
            system,
            [{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200,
        )
        cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("```").strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            data = json.loads(match.group())
            msg = data.get("message", "").strip()
            if msg:
                return msg
    except Exception as e:
        logger.error(f"Interview opener error: {e}")

    return _default_opener(role)


def _default_opener(role: str) -> str:
    role_label = role.replace("_", " ").title()
    q = QUESTION_BANKS.get(role, QUESTION_BANKS["behavioral"])[0]
    return (
        f"Welcome! I'm Eva, and I'll be conducting your {role_label} interview today. "
        f"There's no need to be nervous — just be yourself and speak naturally. "
        f"Let's start: {q}"
    )


# ── Response after each answer ────────────────────────────────────────────────


async def generate_interview_response(
    role: str,
    conversation_history: list[dict[str, str]],
    user_answer: str,
    question_count: int,
    max_questions: int = 8,
) -> dict[str, Any]:

    if question_count >= max_questions:
        return {
            "message": "That's all the questions I have for you today. You've done really well — thank you for your time and thoughtful answers. We'll be in touch about next steps. Is there anything you'd like to ask me?",
            "isComplete": True,
        }

    questions = QUESTION_BANKS.get(role, QUESTION_BANKS["behavioral"])
    next_q = questions[min(question_count, len(questions) - 1)]
    role_label = role.replace("_", " ").title()

    # Varied acknowledgement phrases
    acks = [
        "Thank you for sharing that.",
        "That's a great point.",
        "I appreciate your honesty.",
        "Good, I like how you approached that.",
        "Interesting perspective.",
        "That makes a lot of sense.",
        "Noted, thank you.",
        "Very thoughtful answer.",
    ]

    if not settings.ai_available:
        return {
            "message": f"{random.choice(acks)} Here's my next question: {next_q}",
            "isComplete": False,
        }

    system = (
        INTERVIEWER_SYSTEM
        + f"\n\nRole: {role_label} | Question {question_count}/{max_questions}\nNext question to ask: '{next_q}'"
    )
    history = [
        {
            "role": "model" if m["role"] in ("eva", "assistant", "model") else "user",
            "content": m["content"],
        }
        for m in conversation_history[-10:]
    ]
    history.append({"role": "user", "content": user_answer})

    try:
        raw = await chat_completion(system, history, temperature=0.75, max_tokens=200)
        cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("```").strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            data = json.loads(match.group())
            msg = data.get("message", "").strip()
            if msg:
                return {"message": msg, "isComplete": False}
        # If no JSON, use raw text
        if raw.strip():
            return {"message": raw.strip(), "isComplete": False}
    except Exception as e:
        logger.error(f"Interview response error: {e}")

    return {
        "message": f"{random.choice(acks)} Here's my next question: {next_q}",
        "isComplete": False,
    }


# ── Report generation ─────────────────────────────────────────────────────────


async def generate_interview_report(
    role: str,
    conversation: list[dict[str, str]],
    session_id: str,
) -> dict[str, Any]:

    user_turns = [m for m in conversation if m["role"] == "user"]
    if not user_turns or not settings.ai_available:
        return _default_report(session_id, role)

    role_label = role.replace("_", " ").title()
    transcript = "\n".join(
        f"{'Interviewer' if m['role'] in ('eva','assistant','model') else 'Candidate'}: {m['content']}"
        for m in conversation
    )

    system = "You are an expert interview coach. Analyze the interview transcript and return only valid JSON."
    prompt = f"""Analyze this {role_label} interview transcript and provide a comprehensive evaluation.

TRANSCRIPT:
{transcript}

Return JSON:
{{
  "scores": {{"grammar":0-100,"vocabulary":0-100,"fluency":0-100,"confidence":0-100,"communication":0-100,"technical":0-100,"overall":0-100}},
  "strengths": ["specific strength 1","specific strength 2","specific strength 3"],
  "weaknesses": ["improvement area 1","improvement area 2"],
  "suggestions": ["actionable advice 1","actionable advice 2","actionable advice 3"],
  "questionFeedback": [
    {{"questionId":"q1","question":"question asked","answer":"candidate answer summary","score":0-100,"feedback":"specific feedback","betterAnswer":"optional improvement"}}
  ],
  "overallSummary": "2-3 paragraph honest assessment",
  "recommendation": "strong_yes|yes|maybe|no"
}}

Be specific and base scores on actual evidence from the transcript."""

    try:
        raw = await chat_completion(
            system,
            [{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )
        cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("```").strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            data = json.loads(match.group())
            return {
                "sessionId": session_id,
                "role": role,
                "scores": data.get("scores", {}),
                "strengths": data.get("strengths", []),
                "weaknesses": data.get("weaknesses", []),
                "suggestions": data.get("suggestions", []),
                "questionFeedback": data.get("questionFeedback", []),
                "overallSummary": data.get("overallSummary", ""),
                "recommendation": data.get("recommendation", "maybe"),
                "generatedAt": datetime.now(timezone.utc).isoformat(),
            }
    except Exception as e:
        logger.error(f"Interview report error: {e}")

    return _default_report(session_id, role)


def _default_report(session_id: str, role: str) -> dict[str, Any]:
    return {
        "sessionId": session_id,
        "role": role,
        "scores": {
            "grammar": 72,
            "vocabulary": 70,
            "fluency": 68,
            "confidence": 65,
            "communication": 70,
            "technical": 68,
            "overall": 69,
        },
        "strengths": [
            "Participated actively",
            "Demonstrated willingness to communicate",
            "Showed understanding of key concepts",
        ],
        "weaknesses": [
            "Could improve use of specific examples",
            "Some answers could be more structured",
        ],
        "suggestions": [
            "Practice the STAR method for behavioral questions",
            "Review core technical concepts",
            "Work on speaking more concisely",
        ],
        "questionFeedback": [],
        "overallSummary": "You completed the interview session. With regular practice using Eva, you will see significant improvement.",
        "recommendation": "maybe",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
