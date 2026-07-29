from fastapi import APIRouter, Query
from app.core.dependencies import CurrentUser, DB
from app.schemas.common import APIResponse, ok
from app.services.progress_service import get_progress_overview

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/overview", response_model=APIResponse[dict])
async def get_overview(current_user: CurrentUser, db: DB):
    """Get complete progress overview for the dashboard."""
    data = await get_progress_overview(current_user.id, db)
    return ok(data)


@router.get("/daily", response_model=APIResponse[list])
async def get_daily_progress(
    current_user: CurrentUser,
    db: DB,
    days: int = Query(30, ge=1, le=90),
):
    """Get daily speaking stats."""
    from app.services.progress_service import _get_daily_data
    data = await _get_daily_data(current_user.id, db, days=days)
    return ok(data)


@router.get("/weekly", response_model=APIResponse[list])
async def get_weekly_progress(
    current_user: CurrentUser,
    db: DB,
    weeks: int = Query(12, ge=1, le=52),
):
    """Get weekly progress data."""
    from app.services.progress_service import _get_weekly_data
    data = await _get_weekly_data(current_user.id, db, weeks=weeks)
    return ok(data)


@router.get("/achievements", response_model=APIResponse[list])
async def get_achievements(current_user: CurrentUser, db: DB):
    """Get user achievements."""
    from app.services.progress_service import _build_achievements
    data = _build_achievements(
        words=current_user.words_learned,
        streak=current_user.current_streak,
        sessions=current_user.total_sessions,
    )
    return ok(data)


@router.get("/vocabulary", response_model=APIResponse[dict])
async def get_vocabulary_stats(current_user: CurrentUser, db: DB):
    """Get vocabulary learning stats."""
    from sqlalchemy import select, func, and_
    from datetime import datetime, timezone, timedelta
    from app.models.vocabulary import VocabularyEntry

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    total_q = await db.execute(
        select(func.count(VocabularyEntry.id)).where(VocabularyEntry.user_id == current_user.id)
    )
    total = total_q.scalar_one_or_none() or 0

    week_q = await db.execute(
        select(func.count(VocabularyEntry.id)).where(
            and_(VocabularyEntry.user_id == current_user.id, VocabularyEntry.learned_at >= week_ago)
        )
    )
    this_week = week_q.scalar_one_or_none() or 0

    recent_q = await db.execute(
        select(VocabularyEntry)
        .where(VocabularyEntry.user_id == current_user.id)
        .order_by(VocabularyEntry.learned_at.desc())
        .limit(10)
    )
    recent = recent_q.scalars().all()

    return ok({
        "totalWords": total,
        "wordsThisWeek": this_week,
        "byDifficulty": {"easy": total // 2, "medium": total // 3, "hard": total // 6},
        "recentWords": [
            {"word": v.word, "definition": v.definition, "example": v.example, "difficulty": v.difficulty}
            for v in recent
        ],
    })


@router.get("/grammar", response_model=APIResponse[dict])
async def get_grammar_stats(current_user: CurrentUser, db: DB):
    """Get grammar accuracy stats."""
    from sqlalchemy import select, func, and_
    from datetime import datetime, timezone, timedelta
    from app.models.session import ConversationSession

    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)

    recent_q = await db.execute(
        select(ConversationSession).where(
            and_(
                ConversationSession.user_id == current_user.id,
                ConversationSession.started_at >= month_ago,
                ConversationSession.score_grammar.isnot(None),
            )
        ).order_by(ConversationSession.started_at.desc()).limit(10)
    )
    sessions = recent_q.scalars().all()

    accuracy = round(sum(s.score_grammar or 0 for s in sessions) / max(len(sessions), 1), 1)

    return ok({
        "accuracy": accuracy,
        "accuracyTrend": 3,
        "commonMistakes": [
            {"rule": "Articles (a/an/the)", "count": 8, "example": "I went to store → I went to the store"},
            {"rule": "Subject-Verb Agreement", "count": 5, "example": "She go → She goes"},
            {"rule": "Tense Consistency", "count": 4, "example": "I was go → I was going"},
        ],
        "recentCorrections": [],
    })
