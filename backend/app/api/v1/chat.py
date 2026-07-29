from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.core.dependencies import CurrentUser, DB
from app.models.session import ConversationSession
from app.models.message import Message
from app.models.vocabulary import VocabularyEntry
from app.schemas.session import ChatMessageRequest, ChatMessageResponse
from app.schemas.common import APIResponse, ok
from app.services.conversation_engine import generate_eva_response
from app.services.openai_client import generate_speech, transcribe_audio

router = APIRouter(tags=["chat"])


@router.post("/chat/message", response_model=APIResponse[ChatMessageResponse])
async def send_message(body: ChatMessageRequest, current_user: CurrentUser, db: DB):
    """
    Send a user message and get Eva's response.
    Persists both messages and any vocabulary to the database.
    """
    # Load session
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

    # Build conversation history for AI
    history = [
        {"role": "assistant" if m.role == "eva" else "user", "content": m.content}
        for m in session.messages[-20:]
    ]

    # Generate Eva's response
    eva_result = await generate_eva_response(
        user_message=body.content,
        conversation_history=history,
        mode=session.mode,
        practice_type=session.practice_type,
        user_level=current_user.target_level,
        user_name=current_user.name.split()[0] if current_user.name else "there",
    )

    # Persist user message
    user_msg = Message(
        session_id=session.id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)

    # Persist Eva's message
    eva_msg = Message(
        session_id=session.id,
        role="eva",
        content=eva_result["message"],
        corrections=eva_result.get("corrections", []),
        vocabulary=eva_result.get("vocabulary", []),
    )
    db.add(eva_msg)

    # Persist new vocabulary words
    for word_data in eva_result.get("vocabulary", []):
        vocab = VocabularyEntry(
            user_id=current_user.id,
            word=word_data.get("word", ""),
            definition=word_data.get("definition", ""),
            example=word_data.get("example", ""),
            difficulty=word_data.get("difficulty", "medium"),
            source_session_id=session.id,
        )
        db.add(vocab)

    await db.flush()

    return ok(
        ChatMessageResponse(
            evaMessage=eva_result["message"],
            corrections=eva_result.get("corrections", []),
            vocabulary=eva_result.get("vocabulary", []),
        )
    )


@router.post("/tts/generate")
async def text_to_speech(
    body: dict,
    current_user: CurrentUser,
):
    """Generate speech audio from text using OpenAI TTS."""
    text = body.get("text", "")
    voice = body.get("voice", "nova")

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > 4096:
        raise HTTPException(status_code=400, detail="Text too long (max 4096 chars)")

    audio_bytes = await generate_speech(text, voice=voice)
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache"},
    )


@router.post("/stt/transcribe", response_model=APIResponse[dict])
async def speech_to_text(
    audio: UploadFile = File(...),
    current_user: CurrentUser = None,  # type: ignore
):
    """Transcribe audio to text using OpenAI Whisper."""
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")

    audio_bytes = await audio.read()
    if len(audio_bytes) > 25 * 1024 * 1024:  # 25MB limit
        raise HTTPException(status_code=400, detail="Audio file too large (max 25MB)")

    transcript = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    return ok({"transcript": transcript})
