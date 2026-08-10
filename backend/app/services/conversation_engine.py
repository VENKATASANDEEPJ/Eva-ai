"""
Eva's core conversation engine.
Handles the AI personality, grammar correction, vocabulary enrichment,
and context-aware responses.

When OpenAI is not configured, falls back to a rich scripted response
system so Eva is still useful and varied without an API key.
"""

import json
import re
import random
from typing import Any
from app.services.openai_client import chat_completion
from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.session import GrammarCorrection, VocabularyNote

logger = get_logger(__name__)

# ── Scripted fallback responses (no OpenAI needed) ────────────────────────────
#
# Rules:
# 1. Each entry is (priority, match_fn, responses[])
# 2. Checked in priority order — first match wins
# 3. match_fn receives the lowercased message and returns bool
# 4. More specific patterns must come BEFORE generic ones
#
# This prevents "answer" matching the "ask me a question" bucket when
# the user is actually asking Eva a question.


def _contains(msg: str, *phrases: str) -> bool:
    return any(p in msg for p in phrases)


def _starts_with(msg: str, *prefixes: str) -> bool:
    return any(msg.startswith(p) for p in prefixes)


def _is_asking_eva_question(msg: str) -> bool:
    """Detect when user is directing a specific question AT Eva."""
    patterns = [
        "you answer",
        "can you answer",
        "answer this",
        "answer for this",
        "you tell me",
        "you explain",
        "explain to me",
        "explain this",
        "what do you think",
        "what is your",
        "what's your",
        "how would you",
        "how do you",
        "tell me how",
        "do you know",
        "can you tell",
        "can you explain",
        "what does",
        "what is a",
        "what is an",
        "what are",
        "how does",
        "why does",
        "why is",
        "define ",
        "difference between",
        "what's the difference",
    ]
    return any(p in msg for p in patterns)


# ── Direct question answers (when user asks Eva something) ──────────────────

EVA_DIRECT_ANSWERS: list[tuple[list[str], list[str]]] = [
    (
        [
            "explain a complex technical concept",
            "technical concept to someone",
            "explain technical",
        ],
        [
            "Great question! Here's how I'd explain it: I use the 'grandma test' — if I can explain it to someone with no technical background using everyday analogies, I truly understand it. For example, explaining an API is like explaining a restaurant menu — you order (send a request), the kitchen does the work (server processes it), and your meal arrives (you get a response). You don't need to know how the kitchen works. Does that kind of analogy approach help you? Now I'd love to hear how YOU would explain it — go ahead!",
            "When explaining technical concepts to non-technical people, I focus on three things: use a familiar analogy, avoid jargon entirely, and check understanding with a question. For example, explaining machine learning: 'It's like teaching a child to recognise cats — you show thousands of pictures, and eventually they learn the pattern without you writing rules.' The key is connecting new ideas to something they already know. How would you approach it?",
        ],
    ),
    (
        ["stack and queue", "stack vs queue", "difference between stack"],
        [
            "A stack is like a stack of plates — you add and remove from the top (Last In, First Out). A queue is like a line at a coffee shop — first person in is first to be served (First In, First Out). Use a stack for things like undo/redo, browser history, or recursion. Use a queue for task scheduling, print queues, or BFS traversal. Now, can you give me a real-world example of where you'd use each in code?",
        ],
    ),
    (
        ["time complexity", "big o", "binary search complexity"],
        [
            "Time complexity describes how an algorithm's performance scales with input size. Big O notation gives us the worst-case scenario. Binary search is O(log n) — each step halves the remaining search space. So searching a million-item sorted list takes at most about 20 steps. Compare that to linear search at O(n), which could take a million steps. Does that make sense? Can you tell me the time complexity of a simple nested for loop?",
        ],
    ),
    (
        ["virtual dom", "virtual document object"],
        [
            "The Virtual DOM is React's clever optimisation. Instead of updating the real browser DOM (which is slow), React keeps a lightweight JavaScript copy — the Virtual DOM. When state changes, React updates the virtual copy first, compares it with the previous version (diffing), and only applies the minimal real DOM changes needed. It's like editing a draft before publishing, instead of rewriting the whole page. Makes sense? How would you explain it in your own words?",
        ],
    ),
    (
        ["rest vs graphql", "rest and graphql", "difference between rest"],
        [
            "REST uses fixed endpoints — each URL returns a defined data shape. GraphQL uses a single endpoint where the client specifies exactly what data it needs. REST can lead to over-fetching (getting more data than needed) or under-fetching (needing multiple calls). GraphQL solves both. But REST is simpler to cache and understand. Choose REST for simple, stable APIs; GraphQL when clients have diverse data needs. Which have you worked with?",
        ],
    ),
    (
        ["supervised", "unsupervised learning", "machine learning types"],
        [
            "Supervised learning uses labelled data — you train the model with input-output pairs, like teaching it 'this email is spam, this isn't'. Unsupervised learning finds patterns in unlabelled data — like clustering customers by behaviour without telling it the categories. Think of supervised as learning with an answer key, and unsupervised as finding your own patterns. What's an example use case you'd apply each to?",
        ],
    ),
    (
        ["overfitting", "how to prevent overfitting"],
        [
            "Overfitting is when a model memorises training data instead of learning general patterns — it scores brilliantly on training data but poorly on new data. Think of a student who memorises past exam answers but can't handle new questions. Prevent it with: more training data, regularisation (L1/L2), dropout layers in neural networks, cross-validation, and early stopping. Can you think of a real scenario where overfitting would cause problems?",
        ],
    ),
    (
        ["what is css specificity", "css specificity"],
        [
            "CSS specificity is the rule browsers use to decide which style wins when multiple rules target the same element. It's calculated as a score: inline styles beat IDs, which beat classes, which beat element selectors. Think of it as a points system — inline style = 1000pts, ID = 100pts, class = 10pts, element = 1pt. The highest total wins. So `.nav a` beats `a`, but `#header a` beats `.nav a`. Does that clear it up?",
        ],
    ),
    (
        ["what is caching", "caching strategies", "types of cache"],
        [
            "Caching stores frequently accessed data in a faster storage layer so you don't recompute or re-fetch it every time. Strategies include: in-memory caching (Redis, Memcached) for fast key-value lookups, CDN caching for static assets close to users, database query caching, and HTTP caching with headers like Cache-Control. The key decision is cache invalidation — knowing when stale data needs refreshing. What caching have you used in your projects?",
        ],
    ),
    (
        ["microservices vs monolith", "monolith architecture"],
        [
            "A monolith is one deployable unit — simpler to develop and debug, but harder to scale individual components. Microservices split the app into independent services — each can be deployed, scaled, and updated separately. But they introduce network complexity, distributed tracing, and service discovery challenges. Start with a monolith and extract microservices when you have clear scaling needs and team boundaries. What's your experience with each?",
        ],
    ),
]

# ── Keyword-intent buckets ───────────────────────────────────────────────────

SCRIPTED_BUCKETS: list[tuple[list[str], list[str]]] = [
    # greetings — only match when message IS mostly a greeting
    (
        [
            "hello",
            "hi there",
            "hey there",
            "good morning",
            "good evening",
            "good afternoon",
        ],
        [
            "Hello! Great to have you here. What would you like to work on today — free conversation, interview prep, or something specific?",
            "Hey! Good to see you. Are you ready to practice? We could chat naturally, run through some interview questions, or focus on a skill you want to build.",
            "Hi! Let's make this a great session. What's on your mind — shall we dive straight in?",
        ],
    ),
    # how are you
    (
        ["how are you", "how r u", "how do you do", "how's it going"],
        [
            "I'm doing great, thank you! Always ready to help you practice. How are you feeling today — confident and energised, or would you like to ease in gently?",
            "I'm wonderful, thanks for asking! How about you — how's your day going so far?",
        ],
    ),
    # who is Eva / what can you do
    (
        [
            "who are you",
            "what are you",
            "introduce yourself",
            "tell me about yourself",
            "what can you do",
            "how does this work",
        ],
        [
            "I'm Eva, your AI communication mentor. I help you improve spoken English, build confidence, and prepare for interviews through natural conversation. I correct grammar gently, expand your vocabulary in context, and give honest feedback. Think of me as a patient mentor who genuinely wants you to succeed. What would you like to work on?",
            "I'm Eva — designed to feel like talking to a real mentor, not a chatbot. I can simulate interviews, hold natural conversations, help with grammar and vocabulary, and track your progress. No judgment, just improvement. Where shall we start?",
        ],
    ),
    # asking to be asked a question
    (
        [
            "ask me a question",
            "ask me something",
            "quiz me",
            "test me",
            "give me a question",
            "next question",
        ],
        [
            "Sure! Here's one: Tell me about a time you had to learn something completely new under pressure. What did you do, and what was the outcome?",
            "Of course! Try this: What is your proudest professional achievement, and why does it matter to you?",
            "Let's go! Describe a situation where you disagreed with a decision made by your team or manager. How did you handle it?",
            "Here you go: Walk me through how you would design a simple URL shortening service. Think out loud — I want to hear your reasoning.",
            "Good! Tell me about a project that didn't go as planned. What went wrong, what did you learn, and what would you do differently?",
        ],
    ),
    # yes/ready/okay — wants to start
    (
        [
            "yes",
            "yeah",
            "yep",
            "sure",
            "alright",
            "okay",
            "ok",
            "ready",
            "let's go",
            "let's start",
            "go ahead",
            "start",
        ],
        [
            "Perfect — let's get into it! Tell me about yourself: your background, what you do, and what brings you here today.",
            "Great! To warm up — tell me something interesting that happened to you recently. Work, life, anything. Just speak naturally.",
            "Wonderful! I'll jump straight in: What's one skill you're actively trying to improve right now, and what are you doing about it?",
        ],
    ),
    # thank you
    (
        ["thank you", "thanks", "thank u", "thx", "cheers"],
        [
            "You're very welcome! Keep that energy — you're doing well. What would you like to tackle next?",
            "My pleasure! Every conversation builds your confidence. Shall we keep going?",
        ],
    ),
    # sorry/mistake
    (
        ["sorry", "i made a mistake", "that was wrong", "let me rephrase", "i meant"],
        [
            "No need to apologise — mistakes are exactly how we learn. Let's hear your revised version, or move on if you prefer.",
            "Don't worry at all! The fact that you noticed means you're paying attention, which is great. Go ahead and try again.",
        ],
    ),
    # practice/improve
    (
        [
            "i want to practice",
            "help me improve",
            "improve my english",
            "get better at",
            "work on my",
        ],
        [
            "That's exactly why I'm here! The fastest way to improve is to speak more and worry less about mistakes. Let's have a real conversation right now. Tell me about your work or a recent challenge you faced.",
            "Love the intention! Consistent daily practice beats long infrequent sessions. Let's start — tell me about something you care deeply about, and I'll help you express it more naturally.",
        ],
    ),
]

# Generic follow-up responses — used when no specific pattern matches
GENERIC_RESPONSES = [
    "That's a good point. Can you expand on that a little? The more detail you give, the better I can help you express your ideas clearly.",
    "Interesting — how did that make you feel, and what did you do about it?",
    "I'm following you. What would you say is the most important thing you want me to understand from what you just said?",
    "Good. Now let's push that idea further — can you give me a concrete example or a specific situation where that applies?",
    "I hear you. How would you explain that same thing to someone who has no background in this area?",
    "That's a solid thought. What challenges came up along the way, and how did you handle them?",
    "You're expressing yourself well. Let me ask a follow-up: what outcome did you hope for, and did you achieve it?",
    "Nice. One thing that would strengthen your answer: add a specific result or metric. Can you think of one?",
]


def _get_scripted_response(user_message: str) -> str:
    """
    Pick the best scripted response for a message.
    Priority order:
      1. User is asking Eva a direct question → give a real answer
      2. Specific keyword buckets (exact phrase matches take priority)
      3. Generic follow-up prompts
    """
    msg = user_message.lower().strip()

    # Priority 1: user is directing a question AT Eva — answer it
    if _is_asking_eva_question(msg):
        for keywords, responses in EVA_DIRECT_ANSWERS:
            if any(kw in msg for kw in keywords):
                return random.choice(responses)
        # Asking Eva something we don't have a scripted answer for
        return random.choice(
            [
                "That's a great question to think about! Let me turn it around — what's your initial instinct on this? Sometimes talking through what you already know is the best way to find the answer.",
                "Good thinking! Here's my take: the best way to approach this is to break it into smaller parts. What's the first thing that comes to mind when you think about this topic?",
                "Interesting question. I'd love to hear your perspective first — what do you already know or think about this, and we can build from there.",
            ]
        )

    # Priority 2: specific intent buckets — use exact phrase matching first
    for keywords, responses in SCRIPTED_BUCKETS:
        if any(kw in msg for kw in keywords):
            return random.choice(responses)

    # Priority 3: generic follow-up
    return random.choice(GENERIC_RESPONSES)


# ─────────────────────────────────────────────────────────────────────────────

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
    Generate Eva's response. Uses OpenAI when available,
    falls back to rich scripted responses so Eva is always useful.
    Returns: { message, corrections, vocabulary }
    """
    # No OpenAI key — skip API call entirely, use scripted responses
    if not settings.openai_api_key:
        return {
            "message": _get_scripted_response(user_message),
            "corrections": [],
            "vocabulary": [],
        }

    # Build system prompt
    system = EVA_SYSTEM_PROMPT
    if (
        mode == "practice"
        and practice_type
        and practice_type in PRACTICE_SYSTEM_PROMPTS
    ):
        system += f"\n\nCurrent practice mode: {PRACTICE_SYSTEM_PROMPTS[practice_type]}"
    system += f"\n\nUser's English level: {user_level}"
    system += f"\nAddress the user as '{user_name}' occasionally (not every message)."

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
        return {
            "message": _get_scripted_response(user_message),
            "corrections": [],
            "vocabulary": [],
        }


def _parse_eva_response(raw: str) -> dict[str, Any]:
    """Parse the JSON response from Eva, handling malformed output gracefully."""
    # Try to extract JSON from the response
    json_match = re.search(r"\{.*\}", raw, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group())
            corrections = [
                GrammarCorrection(**c).model_dump()
                for c in (data.get("corrections") or [])
                if isinstance(c, dict)
                and all(
                    k in c for k in ["original", "corrected", "explanation", "rule"]
                )
            ]
            vocabulary = [
                VocabularyNote(**v).model_dump()
                for v in (data.get("vocabulary") or [])
                if isinstance(v, dict)
                and all(k in v for k in ["word", "definition", "example"])
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
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
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
        "strengths": ["Engaged in conversation", "Made effort to communicate"],
        "improvements": ["Continue practicing regularly"],
        "suggestions": ["Try the Daily Practice feature for targeted improvement"],
        "summary": "Good session! Keep practicing to continue improving.",
    }
