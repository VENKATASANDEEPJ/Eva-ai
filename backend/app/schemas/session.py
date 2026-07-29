from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel


class GrammarCorrection(BaseModel):
    original: str
    corrected: str
    explanation: str
    rule: str


class VocabularyNote(BaseModel):
    word: str
    definition: str
    example: str
    difficulty: str = "medium"


class SessionScores(BaseModel):
    grammar: float = 0
    vocabulary: float = 0
    fluency: float = 0
    confidence: float = 0
    communication: float = 0
    pronunciation: float = 0
    technical: Optional[float] = None
    overall: float = 0


class SessionFeedback(BaseModel):
    summary: str
    strengths: List[str]
    improvements: List[str]
    suggestions: List[str]


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    audio_url: Optional[str] = None
    timestamp: datetime
    corrections: Optional[List[GrammarCorrection]] = None
    vocabulary: Optional[List[VocabularyNote]] = None

    model_config = {"from_attributes": True}


class CreateSessionRequest(BaseModel):
    mode: str  # conversation | interview | practice
    practice_type: Optional[str] = None
    interview_role: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    user_id: str
    mode: str
    practice_type: Optional[str] = None
    interview_role: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0
    scores: Optional[SessionScores] = None
    feedback: Optional[SessionFeedback] = None
    messages: List[MessageResponse] = []

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_session(cls, s: Any) -> "SessionResponse":
        scores = None
        if s.score_overall is not None:
            scores = SessionScores(
                grammar=s.score_grammar or 0,
                vocabulary=s.score_vocabulary or 0,
                fluency=s.score_fluency or 0,
                confidence=s.score_confidence or 0,
                communication=s.score_communication or 0,
                pronunciation=s.score_pronunciation or 0,
                technical=s.score_technical,
                overall=s.score_overall or 0,
            )
        feedback = None
        if s.feedback_summary:
            feedback = SessionFeedback(
                summary=s.feedback_summary,
                strengths=s.feedback_strengths or [],
                improvements=s.feedback_improvements or [],
                suggestions=s.feedback_suggestions or [],
            )
        return cls(
            id=s.id,
            user_id=s.user_id,
            mode=s.mode,
            practice_type=s.practice_type,
            interview_role=s.interview_role,
            started_at=s.started_at,
            ended_at=s.ended_at,
            duration_seconds=s.duration_seconds,
            scores=scores,
            feedback=feedback,
            messages=[],
        )


class EndSessionRequest(BaseModel):
    durationSeconds: int


class AddMessageRequest(BaseModel):
    role: str
    content: str
    corrections: Optional[List[dict]] = None
    vocabulary: Optional[List[dict]] = None


class ChatMessageRequest(BaseModel):
    sessionId: str
    content: str


class ChatMessageResponse(BaseModel):
    evaMessage: str
    corrections: List[GrammarCorrection] = []
    vocabulary: List[VocabularyNote] = []
    suggestions: List[str] = []
