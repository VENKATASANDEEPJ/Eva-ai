"""
Groq Client — ultra-fast, completely free AI inference.
Free tier: 14,400 requests/day, 500,000 tokens/day. No billing needed.
Model: llama3-70b-8192 (Meta's Llama 3 70B — excellent quality)

Get a free key at: https://console.groq.com/keys
"""

import asyncio
from functools import lru_cache
from groq import Groq
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _get_client() -> Groq:
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set in .env")
    logger.info(f"Groq client initialised — model: {settings.groq_model}")
    return Groq(api_key=settings.groq_api_key)


async def groq_chat(
    system_prompt: str,
    messages: list[dict[str, str]],
    temperature: float = 0.85,
    max_tokens: int = 1024,
) -> str:
    """
    Send messages to Groq and return the response text.
    Runs the blocking Groq SDK call in a thread pool.
    """
    client = _get_client()

    # Build message list: system + history
    groq_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = "assistant" if msg["role"] in ("eva", "assistant", "model") else "user"
        groq_messages.append({"role": role, "content": msg["content"]})

    def _call() -> str:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=groq_messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=0.95,
        )
        return response.choices[0].message.content or ""

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _call)
