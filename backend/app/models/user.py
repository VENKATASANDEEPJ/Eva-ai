import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, Boolean, Float, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.session import ConversationSession


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(500))
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_active_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Settings (stored as JSON)
    preferred_voice: Mapped[str] = mapped_column(String(50), default="nova")
    speech_rate: Mapped[float] = mapped_column(Float, default=1.0)
    auto_listen: Mapped[bool] = mapped_column(Boolean, default=True)
    sound_effects: Mapped[bool] = mapped_column(Boolean, default=True)
    native_language: Mapped[str] = mapped_column(String(100), default="")
    target_level: Mapped[str] = mapped_column(String(50), default="intermediate")
    focus_areas: Mapped[list] = mapped_column(JSON, default=list)
    notifications: Mapped[bool] = mapped_column(Boolean, default=False)

    # Stats (cached, updated asynchronously)
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)
    total_speaking_minutes: Mapped[int] = mapped_column(Integer, default=0)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    words_learned: Mapped[int] = mapped_column(Integer, default=0)
    sessions_this_week: Mapped[int] = mapped_column(Integer, default=0)
    average_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    sessions: Mapped[list["ConversationSession"]] = relationship(
        "ConversationSession", back_populates="user", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
