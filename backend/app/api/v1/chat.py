"""
Chat, TTS, and STT API endpoints.

Fixes applied:
- STT route had `current_user: CurrentUser = None` alongside `File(...)` which
  caused FastAPI to 422 every request (can't mix File + dependency default=None).
  Fixed: use proper Depends() injection.
- TTS route called generate_speech unconditionally; now guarded by openai_api_key.
  When no key is set it returns 503 so the frontend falls back to Web Speech API.
- STT route guarded the same way — returns 503 when no key, not a 500 crash.
- Content-type check on STT relaxed: browsers send 'application/octet-stream'
  for MediaRecorder blobs, not 'audio/*'. Now we accept any non-empty upload.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, DB, get_current_user
from app.models.session import ConversationSession
from app.models.message import Message
from app.models.vocabulary import VocabularyEntry
from app.schemas.session import ChatMessageRequest, ChatMessageResponse
from app.schemas.common import APIResponse, ok
from app.services.conversation_engine import generate_eva_response
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["chat"])


# ── Chat ──────────────────────────────────────────────────────────────────────


@router.post("/chat/message", response_model=APIResponse[ChatMessageResponse])
async def send_message(body: ChatMessageRequest, current_user: CurrentUser, db: DB):
    """Send a user message and get Eva's response."""
    # Validate input
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    # Load session with its messages for context
    result = await db.execute(
        select(ConversationSession)
        .options(selectinload(ConversationSession.messages))
        .where(
            and_(
                ConversationSession.id == body.sessionId,
                ConversationSession.user_id == current_user.id,
            )
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Build conversation history — last 20 turns for context
    history = [
        {
            "role": "assistant" if m.role == "eva" else "user",
            "content": m.content,
        }
        for m in session.messages[-20:]
    ]

    # Generate Eva's response
    eva_result = await generate_eva_response(
        user_message=body.content.strip(),
        conversation_history=history,
        mode=session.mode,
        practice_type=session.practice_type,
        user_level=current_user.target_level or "intermediate",
        user_name=(current_user.name or "").split()[0] or "there",
    )

    # Persist both messages
    db.add(Message(session_id=session.id, role="user", content=body.content.strip()))
    db.add(
        Message(
            session_id=session.id,
            role="eva",
            content=eva_result["message"],
            corrections=eva_result.get("corrections") or [],
            vocabulary=eva_result.get("vocabulary") or [],
        )
    )

    # Persist new vocabulary entries
    for word_data in eva_result.get("vocabulary") or []:
        if word_data.get("word"):
            db.add(
                VocabularyEntry(
                    user_id=current_user.id,
                    word=word_data["word"],
                    definition=word_data.get("definition", ""),
                    example=word_data.get("example", ""),
                    difficulty=word_data.get("difficulty", "medium"),
                    source_session_id=session.id,
                )
            )

    await db.flush()
    return ok(
        ChatMessageResponse(
            evaMessage=eva_result["message"],
            corrections=eva_result.get("corrections") or [],
            vocabulary=eva_result.get("vocabulary") or [],
        )
    )


# ── TTS ───────────────────────────────────────────────────────────────────────


@router.post("/tts/generate")
async def text_to_speech(body: dict, current_user: CurrentUser):
    """
    Generate speech audio via OpenAI TTS.
    Returns 503 when OPENAI_API_KEY is not configured so the frontend
    can fall back to the browser's Web Speech synthesis gracefully.
    """
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="TTS not available — add OPENAI_API_KEY to backend/.env",
        )

    text = (body.get("text") or "").strip()
    voice = body.get("voice") or settings.openai_tts_voice

    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if len(text) > 4096:
        raise HTTPException(status_code=400, detail="text too long (max 4096 chars)")

    try:
        from app.services.openai_client import generate_speech

        audio_bytes = await generate_speech(text, voice=voice)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-cache"},
        )
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=502, detail="TTS generation failed")


# ── STT ───────────────────────────────────────────────────────────────────────


@router.post("/stt/transcribe", response_model=APIResponse[dict])
async def speech_to_text(
    audio: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Transcribe audio via OpenAI Whisper.
    Returns 503 when OPENAI_API_KEY is not configured.

    Accepts any audio content-type including application/octet-stream
    (produced by MediaRecorder in some browsers).
    """
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="STT not available — add OPENAI_API_KEY to backend/.env",
        )

    audio_bytes = await audio.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")
    if len(audio_bytes) < 100:
        # Too small to be real audio — probably silence or a recording glitch
        return ok({"transcript": ""})
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large (max 25 MB)")

    filename = audio.filename or "recording.webm"

    try:
        from app.services.openai_client import transcribe_audio

        transcript = await transcribe_audio(audio_bytes, filename=filename)
        return ok({"transcript": transcript or ""})
    except Exception as e:
        logger.error(f"STT transcription failed: {e}")
        raise HTTPException(
            status_code=502, detail="Transcription failed — please try again"
        )
