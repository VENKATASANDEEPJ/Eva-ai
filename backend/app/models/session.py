import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, Integer, Float, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.message import Message


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    mode: Mapped[str] = mapped_column(String(50), nullable=False)  # conversation | interview | practice
    practice_type: Mapped[str | None] = mapped_column(String(100))
    interview_role: Mapped[str | None] = mapped_column(String(100))

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)

    # Scores
    score_grammar: Mapped[float | None] = mapped_column(Float)
    score_vocabulary: Mapped[float | None] = mapped_column(Float)
    score_fluency: Mapped[float | None] = mapped_column(Float)
    score_confidence: Mapped[float | None] = mapped_column(Float)
    score_communication: Mapped[float | None] = mapped_column(Float)
    score_pronunciation: Mapped[float | None] = mapped_column(Float)
    score_technical: Mapped[float | None] = mapped_column(Float)
    score_overall: Mapped[float | None] = mapped_column(Float)

    # Feedback (JSON)
    feedback_summary: Mapped[str | None] = mapped_column(Text)
    feedback_strengths: Mapped[list | None] = mapped_column(JSON)
    feedback_improvements: Mapped[list | None] = mapped_column(JSON)
    feedback_suggestions: Mapped[list | None] = mapped_column(JSON)

    # Interview report (JSON blob)
    interview_report: Mapped[dict | None] = mapped_column(JSON)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="session", cascade="all, delete-orphan", order_by="Message.created_at"
    )

    def __repr__(self) -> str:
        return f"<Session id={self.id} mode={self.mode} user={self.user_id}>"
