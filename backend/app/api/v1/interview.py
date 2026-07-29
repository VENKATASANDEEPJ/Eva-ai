from fastapi import APIRouter, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.core.dependencies import CurrentUser, DB
from app.models.session import ConversationSession
from app.models.message import Message
from app.schemas.interview import StartInterviewRequest, StartInterviewResponse, InterviewReport
from app.schemas.common import APIResponse, ok
from app.services.interview_engine import (
    get_interview_opener,
    generate_interview_response,
    generate_interview_report,
)

router = APIRouter(prefix="/interview", tags=["interview"])

# In-memory question counter per session (stateless; replace with Redis for scale)
_question_counters: dict[str, int] = {}


@router.post("/start", response_model=APIResponse[StartInterviewResponse])
async def start_interview(body: StartInterviewRequest, current_user: CurrentUser, db: DB):
    """
    Start a new interview session.
    Creates the session, generates the opener, and returns the first question.
    """
    # Create session
    session = ConversationSession(
        user_id=current_user.id,
        mode="interview",
        interview_role=body.role,
    )
    db.add(session)
    await db.flush()

    # Generate opening message
    opener = await get_interview_opener(body.role)

    # Persist Eva's opening as first message
    msg = Message(session_id=session.id, role="eva", content=opener)
    db.add(msg)
    await db.flush()

    _question_counters[session.id] = 1

    return ok(
        StartInterviewResponse(
            sessionId=session.id,
            role=body.role,
            firstQuestion=opener,
        )
    )


@router.post("/{session_id}/answer", response_model=APIResponse[dict])
async def submit_answer(session_id: str, body: dict, current_user: CurrentUser, db: DB):
    """
    Submit a candidate answer and get the next interview question.
    """
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
        raise HTTPException(status_code=404, detail="Interview session not found")

    answer = body.get("answer", "")
    if not answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    # Persist candidate's answer
    user_msg = Message(session_id=session_id, role="user", content=answer)
    db.add(user_msg)
    await db.flush()

    # Build conversation history
    history = [
        {"role": "assistant" if m.role == "eva" else "user", "content": m.content}
        for m in session.messages
    ]

    question_count = _question_counters.get(session_id, 1)
    response = await generate_interview_response(
        role=session.interview_role or "behavioral",
        conversation_history=history,
        user_answer=answer,
        question_count=question_count,
    )

    # Persist Eva's response
    eva_msg = Message(session_id=session_id, role="eva", content=response["message"])
    db.add(eva_msg)
    await db.flush()

    _question_counters[session_id] = question_count + 1

    return ok({
        "evaMessage": response["message"],
        "isComplete": response.get("isComplete", False),
        "questionNumber": question_count + 1,
    })


@router.post("/{session_id}/report", response_model=APIResponse[InterviewReport])
async def generate_report(session_id: str, current_user: CurrentUser, db: DB):
    """
    Generate a comprehensive interview performance report.
    """
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
        raise HTTPException(status_code=404, detail="Interview session not found")

    # Build message history
    history = [
        {"role": "assistant" if m.role == "eva" else "user", "content": m.content}
        for m in session.messages
    ]

    report_data = await generate_interview_report(
        role=session.interview_role or "behavioral",
        conversation=history,
        session_id=session_id,
    )

    # Persist scores to session
    scores = report_data.get("scores", {})
    session.score_grammar = scores.get("grammar")
    session.score_vocabulary = scores.get("vocabulary")
    session.score_fluency = scores.get("fluency")
    session.score_confidence = scores.get("confidence")
    session.score_communication = scores.get("communication")
    session.score_technical = scores.get("technical")
    session.score_overall = scores.get("overall")
    session.feedback_summary = report_data.get("overallSummary")
    session.feedback_strengths = report_data.get("strengths")
    session.feedback_improvements = report_data.get("weaknesses")
    session.feedback_suggestions = report_data.get("suggestions")
    session.interview_report = report_data

    from app.services.progress_service import update_user_stats
    await update_user_stats(current_user.id, db)
    await db.flush()

    # Clean up counter
    _question_counters.pop(session_id, None)

    return ok(InterviewReport(**report_data))


@router.get("/{session_id}/report", response_model=APIResponse[InterviewReport])
async def get_report(session_id: str, current_user: CurrentUser, db: DB):
    """Retrieve a previously generated interview report."""
    result = await db.execute(
        select(ConversationSession).where(
            and_(
                ConversationSession.id == session_id,
                ConversationSession.user_id == current_user.id,
            )
        )
    )
    session = result.scalar_one_or_none()
    if not session or not session.interview_report:
        raise HTTPException(status_code=404, detail="Report not found")

    return ok(InterviewReport(**session.interview_report))


@router.get("/reports", response_model=APIResponse[list])
async def list_reports(current_user: CurrentUser, db: DB):
    """List all interview sessions with reports."""
    result = await db.execute(
        select(ConversationSession)
        .where(
            and_(
                ConversationSession.user_id == current_user.id,
                ConversationSession.mode == "interview",
                ConversationSession.interview_report.isnot(None),
            )
        )
        .order_by(ConversationSession.started_at.desc())
        .limit(20)
    )
    sessions = result.scalars().all()

    reports = []
    for s in sessions:
        if s.interview_report:
            reports.append(s.interview_report)

    return ok(reports)
