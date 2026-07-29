"""
Thin wrapper around the OpenAI async client.
Centralises model names and error handling.
"""
from functools import lru_cache
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_openai_client() -> AsyncOpenAI:
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY not set — AI features will return mock responses")
    return AsyncOpenAI(api_key=settings.openai_api_key or "sk-placeholder")


async def chat_completion(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.85,
    max_tokens: int = 1024,
    response_format: dict | None = None,
) -> str:
    client = get_openai_client()
    kwargs: dict = dict(
        model=model or settings.openai_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    if response_format:
        kwargs["response_format"] = response_format

    try:
        resp = await client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"OpenAI chat_completion error: {e}")
        raise


async def generate_speech(text: str, voice: str | None = None) -> bytes:
    client = get_openai_client()
    try:
        response = await client.audio.speech.create(
            model=settings.openai_tts_model,
            voice=voice or settings.openai_tts_voice,  # type: ignore[arg-type]
            input=text,
            response_format="mp3",
        )
        return response.content
    except Exception as e:
        logger.error(f"OpenAI TTS error: {e}")
        raise


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    client = get_openai_client()
    try:
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename
        transcript = await client.audio.transcriptions.create(
            model=settings.openai_stt_model,
            file=audio_file,
            language="en",
        )
        return transcript.text
    except Exception as e:
        logger.error(f"OpenAI STT error: {e}")
        raise
