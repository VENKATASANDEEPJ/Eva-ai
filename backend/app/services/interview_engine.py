"""
Eva's Interview Engine.
Generates role-specific questions, evaluates answers, and produces
detailed interview reports.

When OpenAI is not configured, runs a fully scripted interview using
the question banks — no API key needed.
"""

import json
import re
import random
from datetime import datetime, timezone
from typing import Any
from app.services.openai_client import chat_completion
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Role-specific question banks (seed questions used if AI generation fails)
QUESTION_BANKS: dict[str, list[str]] = {
    "software_engineer": [
        "Tell me about yourself and your software engineering background.",
        "Can you explain the difference between a stack and a queue? When would you use each?",
        "Describe a challenging technical problem you solved. What was your approach?",
        "How would you design a URL shortening service like bit.ly?",
        "Explain the concept of time complexity. What's the Big O of binary search?",
        "Tell me about a time you had a disagreement with a teammate. How did you resolve it?",
        "What is the difference between synchronous and asynchronous programming?",
        "How do you ensure code quality in your projects?",
        "Describe your experience with version control and collaboration workflows.",
        "Where do you see yourself in 5 years as an engineer?",
    ],
    "frontend_developer": [
        "Walk me through your experience with React or similar frameworks.",
        "What is the difference between `let`, `const`, and `var` in JavaScript?",
        "How do you approach making a website accessible?",
        "Explain the concept of the Virtual DOM and why it's useful.",
        "How do you optimize the performance of a slow-loading web page?",
        "Describe a time you built something you're proud of. Walk me through it.",
        "What is CSS specificity and how does it affect styling?",
        "How do you handle cross-browser compatibility issues?",
        "Describe your experience with responsive design.",
        "How do you stay up to date with the rapidly changing frontend ecosystem?",
    ],
    "backend_developer": [
        "Tell me about your experience with backend frameworks and languages.",
        "What is REST and how does it differ from GraphQL?",
        "How would you design a database schema for a social media platform?",
        "Explain the difference between SQL and NoSQL databases. When do you choose each?",
        "How do you handle authentication and authorization in your APIs?",
        "Describe a time you improved the performance of a slow backend service.",
        "What is caching? What strategies have you used?",
        "How do you approach error handling and logging in production?",
        "Explain microservices vs monolith architecture trade-offs.",
        "How do you handle database migrations in production?",
    ],
    "fullstack_developer": [
        "How do you approach building a full-stack feature from scratch?",
        "Walk me through your most complex full-stack project.",
        "How do you decide whether logic belongs in the frontend or backend?",
        "Describe your experience with API design and consumption.",
        "How do you manage state in large frontend applications?",
        "What deployment strategies have you used?",
        "How do you handle security concerns on both frontend and backend?",
        "Describe your testing approach for full-stack applications.",
        "How do you handle real-time features like notifications or live updates?",
        "Tell me about a time you had to learn a new technology quickly.",
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
        "What are your salary expectations?",
        "How do you handle stress and pressure at work?",
        "Describe your ideal work environment.",
        "Do you have any questions for us?",
    ],
    "behavioral": [
        "Tell me about a time you faced a significant challenge at work. How did you overcome it?",
        "Describe a situation where you had to work with a difficult colleague.",
        "Tell me about a time you failed. What did you learn from it?",
        "Give me an example of when you showed leadership.",
        "Describe a time you had to learn something new quickly under pressure.",
        "Tell me about a time you went above and beyond for a customer or team member.",
        "Describe a situation where you had to manage multiple priorities.",
        "Tell me about a time you disagreed with your manager. What happened?",
        "Give me an example of a time you used data to make a decision.",
        "Tell me about your proudest professional achievement.",
    ],
}

INTERVIEW_SYSTEM_PROMPT = """You are Eva, conducting a realistic job interview. You are professional, fair, and encouraging.

Your interview style:
- Ask questions naturally, as a real interviewer would
- Listen carefully and ask relevant follow-up questions
- Maintain professional warmth — you want the candidate to succeed
- Don't reveal whether an answer was good or bad during the interview
- After each answer, transition naturally to the next question
- You may ask 1 follow-up before moving on

Return responses as JSON:
{
  "message": "Your interviewer response with the next question",
  "followUp": false
}"""


async def get_interview_opener(role: str) -> str:
    """Generate a natural interview opening."""
    # No OpenAI key — use the scripted opener directly
    if not settings.openai_api_key:
        return _default_opener(role)

    role_label = role.replace("_", " ").title()
    prompt = f"""Generate a warm, professional interview opening for a {role_label} position.
Include: brief greeting, your name (Eva, Senior Interviewer), the role, and the first interview question.
Return as JSON: {{"message": "..."}}
Keep it natural and encouraging. Under 100 words."""

    try:
        raw = await chat_completion(
            [{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200,
        )
        data = json.loads(re.search(r"\{.*\}", raw, re.DOTALL).group())  # type: ignore
        return data.get("message", _default_opener(role))
    except Exception:
        return _default_opener(role)


def _default_opener(role: str) -> str:
    role_label = role.replace("_", " ").title()
    question = QUESTION_BANKS.get(role, QUESTION_BANKS["behavioral"])[0]
    return f"Welcome! I'm Eva, and I'll be conducting your {role_label} interview today. I hope you're feeling comfortable — there's no need to be nervous, just be yourself. Let's start with a simple one: {question}"


async def generate_interview_response(
    role: str,
    conversation_history: list[dict[str, str]],
    user_answer: str,
    question_count: int,
    max_questions: int = 8,
) -> dict[str, Any]:
    """Generate the next interviewer message after a candidate's answer."""

    if question_count >= max_questions:
        return {
            "message": "That's all the questions I have for you today. You've done really well! Thank you for your time and thoughtful answers. We'll be in touch shortly about next steps. Is there anything you'd like to ask me?",
            "isComplete": True,
        }

    role_label = role.replace("_", " ").title()
    questions = QUESTION_BANKS.get(role, QUESTION_BANKS["behavioral"])
    next_q_idx = min(question_count, len(questions) - 1)
    next_question = questions[next_q_idx]

    system = (
        INTERVIEW_SYSTEM_PROMPT
        + f"\n\nRole: {role_label}\nQuestion {question_count}/{max_questions}"
    )
    trimmed = conversation_history[-10:]

    # No OpenAI key — use varied scripted transitions
    if not settings.openai_api_key:
        acknowledgements = [
            "Thank you for sharing that.",
            "That's a thoughtful answer.",
            "I appreciate your perspective.",
            "Good, I like how you framed that.",
            "Interesting — thanks for being honest about that.",
            "That makes sense.",
            "Great, I can see you've thought about this.",
            "Noted, thank you.",
        ]
        ack = random.choice(acknowledgements)
        connectors = [
            f"{ack} Let's move on to the next question: {next_question}",
            f"{ack} Here's what I'd like to ask you next: {next_question}",
            f"{ack} Moving forward — {next_question}",
            f"{ack} Now I'd like to explore something else: {next_question}",
        ]
        return {
            "message": random.choice(connectors),
            "isComplete": False,
        }

    messages = [
        {"role": "system", "content": system},
        *trimmed,
        {"role": "user", "content": user_answer},
        {
            "role": "system",
            "content": f"The next prepared question is: '{next_question}'. Acknowledge their answer briefly and naturally transition to this question.",
        },
    ]

    try:
        raw = await chat_completion(messages, temperature=0.75, max_tokens=300)
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return {"message": data.get("message", raw), "isComplete": False}
        return {"message": raw, "isComplete": False}
    except Exception as e:
        logger.error(f"Interview response error: {e}")
        return {
            "message": f"Thank you for that answer. Here's my next question: {next_question}",
            "isComplete": False,
        }


async def generate_interview_report(
    role: str,
    conversation: list[dict[str, str]],
    session_id: str,
) -> dict[str, Any]:
    """
    Analyze the full interview and produce a detailed report with scores,
    strengths, weaknesses, suggestions, and per-question feedback.
    """
    if not conversation:
        return _default_report(session_id, role)

    user_turns = [m for m in conversation if m["role"] == "user"]
    if not user_turns:
        return _default_report(session_id, role)

    role_label = role.replace("_", " ").title()
    conversation_text = "\n".join(
        f"{'Interviewer' if m['role'] in ('eva', 'assistant') else 'Candidate'}: {m['content']}"
        for m in conversation
    )

    prompt = f"""You are an expert interview coach. Analyze this {role_label} interview and provide a comprehensive evaluation.

INTERVIEW TRANSCRIPT:
{conversation_text}

Provide your evaluation as a JSON object:
{{
  "scores": {{
    "grammar": <0-100>,
    "vocabulary": <0-100>,
    "fluency": <0-100>,
    "confidence": <0-100>,
    "communication": <0-100>,
    "technical": <0-100>,
    "overall": <0-100>
  }},
  "strengths": [
    "specific strength observed in the interview",
    "another specific strength",
    "third strength"
  ],
  "weaknesses": [
    "specific area for improvement",
    "another area",
    "third area"
  ],
  "suggestions": [
    "concrete actionable advice 1",
    "concrete actionable advice 2",
    "concrete actionable advice 3"
  ],
  "questionFeedback": [
    {{
      "questionId": "q1",
      "question": "the question asked",
      "answer": "brief summary of their answer",
      "score": <0-100>,
      "feedback": "specific feedback on this answer",
      "betterAnswer": "how they could have answered better (optional)"
    }}
  ],
  "overallSummary": "2-3 paragraph overall assessment of the candidate's performance",
  "recommendation": "strong_yes|yes|maybe|no"
}}

Be specific, fair, and constructive. Base scores on actual evidence from the transcript.
For technical roles, evaluate technical accuracy more heavily.
For HR/behavioral, focus on communication, structure (STAR method), and professionalism."""

    try:
        raw = await chat_completion(
            [{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
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
        logger.error(f"Interview report generation error: {e}")

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
            "Participated actively in the interview",
            "Demonstrated willingness to communicate",
            "Showed understanding of key concepts",
        ],
        "weaknesses": [
            "Could improve use of specific examples",
            "Some answers could be more structured",
        ],
        "suggestions": [
            "Practice the STAR method for behavioral questions",
            "Review core technical concepts for your role",
            "Work on speaking more confidently and concisely",
        ],
        "questionFeedback": [],
        "overallSummary": "You completed the interview session. With regular practice using Eva, you'll see significant improvement in your interview performance.",
        "recommendation": "maybe",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
