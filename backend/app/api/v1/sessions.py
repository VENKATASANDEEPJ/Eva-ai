from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.core.dependencies import CurrentUser, DB
from app.models.session import ConversationSession
from app.models.message import Message
from app.schemas.session import (
    CreateSessionRequest,
    SessionResponse,
    EndSessionRequest,
    AddMessageRequest,
    MessageResponse,
)
from app.schemas.common import APIResponse, PaginatedData, ok
from datetime import datetime, timezone

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=APIResponse[SessionResponse])
async def create_session(body: CreateSessionRequest, current_user: CurrentUser, db: DB):
    """Create a new conversation session."""
    session = ConversationSession(
        user_id=current_user.id,
        mode=body.mode,
        practice_type=body.practice_type,
        interview_role=body.interview_role,
    )
    db.add(session)
    await db.flush()
    return ok(SessionResponse.from_orm_session(session), "Session created")


@router.get("", response_model=APIResponse[PaginatedData])
async def list_sessions(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    """List user's sessions with pagination."""
    offset = (page - 1) * pageSize

    total_q = await db.execute(
        select(func.count(ConversationSession.id)).where(
            ConversationSession.user_id == current_user.id
        )
    )
    total = total_q.scalar_one_or_none() or 0

    sessions_q = await db.execute(
        select(ConversationSession)
        .where(ConversationSession.user_id == current_user.id)
        .order_by(ConversationSession.started_at.desc())
        .offset(offset)
        .limit(pageSize)
    )
    sessions = sessions_q.scalars().all()

    return ok(
        PaginatedData(
            items=[SessionResponse.from_orm_session(s).model_dump() for s in sessions],
            total=total,
            page=page,
            page_size=pageSize,
            has_more=(offset + pageSize) < total,
        )
    )


@router.get("/{session_id}", response_model=APIResponse[SessionResponse])
async def get_session(session_id: str, current_user: CurrentUser, db: DB):
    """Get a single session with messages."""
    result = await db.execute(
        select(ConversationSession)
        .options(selectinload(ConversationSession.messages))
        .where(
            and_(
                ConversationSession.id == session_id,
                ConversationSession.user_id == current_user.id,
            )
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    resp = SessionResponse.from_orm_session(session)
    resp.messages = [
        MessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            audio_url=m.audio_url,
            timestamp=m.created_at,
            corrections=m.corrections,
            vocabulary=m.vocabulary,
        )
        for m in session.messages
    ]
    return ok(resp)


@router.patch("/{session_id}/end", response_model=APIResponse[SessionResponse])
async def end_session(session_id: str, body: EndSessionRequest, current_user: CurrentUser, db: DB):
    """Mark a session as ended and record its duration."""
    result = await db.execute(
        select(ConversationSession).where(
            and_(
                ConversationSession.id == session_id,
                ConversationSession.user_id == current_user.id,
            )
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.ended_at = datetime.now(timezone.utc)
    session.duration_seconds = body.durationSeconds

    # Update user stats asynchronously
    from app.services.progress_service import update_user_stats
    await update_user_stats(current_user.id, db)

    await db.flush()
    return ok(SessionResponse.from_orm_session(session))


@router.post("/{session_id}/messages", response_model=APIResponse[MessageResponse])
async def add_message(session_id: str, body: AddMessageRequest, current_user: CurrentUser, db: DB):
    """Add a message to a session (used for manual persistence from frontend)."""
    result = await db.execute(
        select(ConversationSession).where(
            and_(
                ConversationSession.id == session_id,
                ConversationSession.user_id == current_user.id,
            )
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msg = Message(
        session_id=session_id,
        role=body.role,
        content=body.content,
        corrections=body.corrections,
        vocabulary=body.vocabulary,
    )
    db.add(msg)
    await db.flush()

    return ok(
        MessageResponse(
            id=msg.id,
            session_id=msg.session_id,
            role=msg.role,
            content=msg.content,
            timestamp=msg.created_at,
            corrections=msg.corrections,
            vocabulary=msg.vocabulary,
        )
    )
