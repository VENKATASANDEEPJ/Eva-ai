"""
AI Router — single entry point for all chat completions.

Priority order (first available wins):
  1. Groq       — FREE, fast, llama3-70b (get key: console.groq.com/keys)
  2. Gemini     — FREE, smart (get key: aistudio.google.com/app/apikey)
  3. OpenAI     — Paid, best quality
  4. Scripted   — Keyword-based fallback, no AI needed
"""

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def chat_completion(
    system_prompt: str,
    messages: list[dict[str, str]],
    temperature: float = 0.85,
    max_tokens: int = 1024,
) -> str:
    """
    Route to the best available AI provider.
    Raises RuntimeError if no provider is configured.
    """
    provider = settings.ai_provider
    logger.debug(f"AI provider: {provider}")

    if provider == "groq":
        from app.services.groq_client import groq_chat

        return await groq_chat(system_prompt, messages, temperature, max_tokens)

    if provider == "gemini":
        from app.services.gemini_client import gemini_chat

        return await gemini_chat(system_prompt, messages, temperature, max_tokens)

    if provider == "openai":
        from app.services.openai_client import chat_completion as openai_chat

        full_messages = [{"role": "system", "content": system_prompt}] + messages
        return await openai_chat(
            full_messages, temperature=temperature, max_tokens=max_tokens
        )

    raise RuntimeError("No AI provider configured — add GROQ_API_KEY to backend/.env")
