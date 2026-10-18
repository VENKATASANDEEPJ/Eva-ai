"""
Gemini Client — wraps google-generativeai for Eva.
Free tier: 15 requests/min, 1 million tokens/day, no billing required.

Model used: gemini-1.5-flash  (fast, free, capable)
Fallback:   gemini-1.0-pro    (if flash unavailable)
"""

from functools import lru_cache
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _get_model() -> genai.GenerativeModel:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in .env")

    genai.configure(api_key=settings.gemini_api_key)

    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        generation_config=GenerationConfig(
            temperature=0.85,
            top_p=0.95,
            top_k=40,
            max_output_tokens=1024,
        ),
        safety_settings=[
            {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
        ],
    )
    logger.info(f"Gemini model initialised: {settings.gemini_model}")
    return model


async def gemini_chat(
    system_prompt: str,
    messages: list[dict[str, str]],   # [{"role": "user"|"model", "content": "..."}]
    temperature: float = 0.85,
    max_tokens: int = 1024,
) -> str:
    """
    Send a multi-turn conversation to Gemini and return the response text.

    Gemini uses "user" / "model" roles (not "assistant").
    The system prompt is prepended as the first user turn with a model ACK,
    which is the recommended pattern for Gemini 1.5.
    """
    import asyncio

    model = _get_model()

    # Build history: system prompt + prior turns
    history: list[dict] = []

    # Inject system prompt as opening exchange
    if system_prompt:
        history.append({"role": "user",  "parts": [system_prompt]})
        history.append({"role": "model", "parts": ["Understood. I will follow these instructions."]})

    # Add conversation history (all turns except the last user message)
    for msg in messages[:-1]:
        role = "model" if msg["role"] in ("assistant", "eva", "model") else "user"
        history.append({"role": role, "parts": [msg["content"]]})

    # Last message is the current user input
    last_message = messages[-1]["content"] if messages else ""

    try:
        chat = model.start_chat(history=history)

        # Run the blocking SDK call in a thread so we don't block the event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: chat.send_message(
                last_message,
                generation_config=GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            ),
        )
        return response.text

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise
