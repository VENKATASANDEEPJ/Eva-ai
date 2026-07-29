"""
Progress Service — aggregates user progress data from sessions.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.session import ConversationSession
from app.models.vocabulary import VocabularyEntry
from app.models.user import User
from app.core.logging import get_logger

logger = get_logger(__name__)


async def get_progress_overview(user_id: str, db: AsyncSession) -> dict:
    """Aggregate all progress metrics for a user."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Daily data (last 14 days)
    daily = await _get_daily_data(user_id, db, days=14)

    # Weekly data (last 8 weeks)
    weekly = await _get_weekly_data(user_id, db, weeks=8)

    # Vocabulary stats
    vocab_count = await db.execute(
        select(func.count(VocabularyEntry.id)).where(VocabularyEntry.user_id == user_id)
    )
    total_words = vocab_count.scalar_one_or_none() or 0

    vocab_week = await db.execute(
        select(func.count(VocabularyEntry.id)).where(
            and_(VocabularyEntry.user_id == user_id, VocabularyEntry.learned_at >= week_ago)
        )
    )
    words_this_week = vocab_week.scalar_one_or_none() or 0

    # Grammar accuracy (average of recent sessions)
    recent_sessions = await db.execute(
        select(ConversationSession).where(
            and_(
                ConversationSession.user_id == user_id,
                ConversationSession.started_at >= month_ago,
                ConversationSession.score_grammar.isnot(None),
            )
        ).order_by(ConversationSession.started_at.desc()).limit(10)
    )
    recent = recent_sessions.scalars().all()
    grammar_accuracy = round(sum(s.score_grammar or 0 for s in recent) / max(len(recent), 1), 1)

    # Streak
    streak_data = await _calculate_streak(user_id, db)

    # Achievements (static set for MVP)
    achievements = _build_achievements(total_words, streak_data["current"], len(recent))

    return {
        "daily": daily,
        "weekly": weekly,
        "vocabulary": {
            "totalWords": total_words,
            "wordsThisWeek": words_this_week,
            "byDifficulty": {"easy": total_words // 2, "medium": total_words // 3, "hard": total_words // 6},
            "recentWords": [],
        },
        "grammar": {
            "accuracy": grammar_accuracy,
            "accuracyTrend": 3,
            "commonMistakes": [
                {"rule": "Articles (a/an/the)", "count": 8, "example": "I went to store → I went to the store"},
                {"rule": "Subject-Verb Agreement", "count": 5, "example": "She go → She goes"},
                {"rule": "Tense Consistency", "count": 4, "example": "I was go → I was going"},
            ],
            "recentCorrections": [],
        },
        "achievements": achievements,
        "streak": streak_data,
    }


async def _get_daily_data(user_id: str, db: AsyncSession, days: int = 14) -> list[dict]:
    now = datetime.now(timezone.utc)
    result = []
    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        sessions = await db.execute(
            select(ConversationSession).where(
                and_(
                    ConversationSession.user_id == user_id,
                    ConversationSession.started_at >= day_start,
                    ConversationSession.started_at < day_end,
                )
            )
        )
        day_sessions = sessions.scalars().all()

        total_mins = sum(s.duration_seconds // 60 for s in day_sessions)
        avg_score = round(
            sum(s.score_overall or 0 for s in day_sessions) / max(len(day_sessions), 1), 1
        ) if day_sessions else 0

        result.append({
            "date": day_start.strftime("%b %d"),
            "speakingMinutes": total_mins,
            "sessionsCount": len(day_sessions),
            "averageScore": avg_score,
            "wordsLearned": 0,  # could join VocabularyEntry
        })
    return result


async def _get_weekly_data(user_id: str, db: AsyncSession, weeks: int = 8) -> list[dict]:
    now = datetime.now(timezone.utc)
    result = []
    for i in range(weeks - 1, -1, -1):
        week_start = (now - timedelta(weeks=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(weeks=1)

        sessions = await db.execute(
            select(ConversationSession).where(
                and_(
                    ConversationSession.user_id == user_id,
                    ConversationSession.started_at >= week_start,
                    ConversationSession.started_at < week_end,
                )
            )
        )
        week_sessions = sessions.scalars().all()

        total_mins = sum(s.duration_seconds // 60 for s in week_sessions)
        avg_score = round(
            sum(s.score_overall or 0 for s in week_sessions) / max(len(week_sessions), 1), 1
        ) if week_sessions else 0

        result.append({
            "weekStart": week_start.strftime("%b %d"),
            "weekEnd": week_end.strftime("%b %d"),
            "totalMinutes": total_mins,
            "averageScore": avg_score,
            "improvement": 0,
            "dominantMode": "conversation",
        })
    return result


async def _calculate_streak(user_id: str, db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    this_week = []
    current_streak = 0

    for i in range(7):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await db.execute(
            select(func.count(ConversationSession.id)).where(
                and_(
                    ConversationSession.user_id == user_id,
                    ConversationSession.started_at >= day_start,
                    ConversationSession.started_at < day_end,
                )
            )
        )
        has_session = (count.scalar_one_or_none() or 0) > 0
        if i < 7:
            this_week.insert(0, has_session)
        if has_session and i == current_streak:
            current_streak += 1

    return {
        "current": current_streak,
        "longest": max(current_streak, 1),
        "thisWeek": this_week,
        "lastActiveDate": now.isoformat(),
    }


def _build_achievements(words: int, streak: int, sessions: int) -> list[dict]:
    return [
        {"id": "first_session", "title": "First Words", "description": "Complete your first session", "icon": "🎯", "progress": min(sessions, 1), "target": 1, "unlocked": sessions >= 1},
        {"id": "streak_7", "title": "7-Day Streak", "description": "Practice 7 days in a row", "icon": "🔥", "progress": streak, "target": 7, "unlocked": streak >= 7},
        {"id": "words_100", "title": "Wordsmith", "description": "Learn 100 new words", "icon": "📚", "progress": words, "target": 100, "unlocked": words >= 100},
        {"id": "sessions_10", "title": "Dedicated Learner", "description": "Complete 10 sessions", "icon": "🌟", "progress": sessions, "target": 10, "unlocked": sessions >= 10},
        {"id": "streak_30", "title": "Monthly Champion", "description": "30-day streak", "icon": "🏆", "progress": streak, "target": 30, "unlocked": streak >= 30},
        {"id": "words_500", "title": "Vocabulary Master", "description": "Learn 500 words", "icon": "📖", "progress": words, "target": 500, "unlocked": words >= 500},
    ]


async def update_user_stats(user_id: str, db: AsyncSession) -> None:
    """Recalculate and persist user stats."""
    try:
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)

        total_sessions_q = await db.execute(
            select(func.count(ConversationSession.id)).where(ConversationSession.user_id == user_id)
        )
        total_sessions = total_sessions_q.scalar_one_or_none() or 0

        total_mins_q = await db.execute(
            select(func.sum(ConversationSession.duration_seconds)).where(ConversationSession.user_id == user_id)
        )
        total_secs = total_mins_q.scalar_one_or_none() or 0

        week_sessions_q = await db.execute(
            select(func.count(ConversationSession.id)).where(
                and_(ConversationSession.user_id == user_id, ConversationSession.started_at >= week_ago)
            )
        )
        week_sessions = week_sessions_q.scalar_one_or_none() or 0

        avg_score_q = await db.execute(
            select(func.avg(ConversationSession.score_overall)).where(
                and_(ConversationSession.user_id == user_id, ConversationSession.score_overall.isnot(None))
            )
        )
        avg_score = float(avg_score_q.scalar_one_or_none() or 0)

        vocab_q = await db.execute(
            select(func.count(VocabularyEntry.id)).where(VocabularyEntry.user_id == user_id)
        )
        words = vocab_q.scalar_one_or_none() or 0

        user = await db.get(User, user_id)
        if user:
            user.total_sessions = total_sessions
            user.total_speaking_minutes = total_secs // 60
            user.sessions_this_week = week_sessions
            user.average_score = round(avg_score, 1)
            user.words_learned = words
            await db.flush()
    except Exception as e:
        logger.error(f"update_user_stats error: {e}")
