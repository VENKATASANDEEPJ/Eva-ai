from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator


class UserSettings(BaseModel):
    preferred_voice: str = "nova"
    speech_rate: float = 1.0
    auto_listen: bool = True
    sound_effects: bool = True
    native_language: str = ""
    target_level: str = "intermediate"
    focus_areas: List[str] = []
    notifications: bool = False


class UserStats(BaseModel):
    total_sessions: int = 0
    total_speaking_minutes: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    words_learned: int = 0
    sessions_this_week: int = 0
    average_score: float = 0.0


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar: Optional[str] = None
    created_at: datetime
    last_active_at: datetime
    settings: UserSettings
    stats: UserStats

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_user(cls, user: object) -> "UserResponse":
        from app.models.user import User as UserModel
        u: UserModel = user  # type: ignore
        return cls(
            id=u.id,
            email=u.email,
            name=u.name,
            avatar=u.avatar,
            created_at=u.created_at,
            last_active_at=u.last_active_at,
            settings=UserSettings(
                preferred_voice=u.preferred_voice,
                speech_rate=u.speech_rate,
                auto_listen=u.auto_listen,
                sound_effects=u.sound_effects,
                native_language=u.native_language,
                target_level=u.target_level,
                focus_areas=u.focus_areas or [],
                notifications=u.notifications,
            ),
            stats=UserStats(
                total_sessions=u.total_sessions,
                total_speaking_minutes=u.total_speaking_minutes,
                current_streak=u.current_streak,
                longest_streak=u.longest_streak,
                words_learned=u.words_learned,
                sessions_this_week=u.sessions_this_week,
                average_score=u.average_score,
            ),
        )


class UpdateSettingsRequest(BaseModel):
    preferred_voice: Optional[str] = None
    speech_rate: Optional[float] = None
    auto_listen: Optional[bool] = None
    sound_effects: Optional[bool] = None
    native_language: Optional[str] = None
    target_level: Optional[str] = None
    focus_areas: Optional[List[str]] = None
    notifications: Optional[bool] = None
