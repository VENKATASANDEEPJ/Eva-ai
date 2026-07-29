from typing import List, Optional
from pydantic import BaseModel
from app.schemas.session import SessionScores


class StartInterviewRequest(BaseModel):
    role: str


class StartInterviewResponse(BaseModel):
    sessionId: str
    role: str
    firstQuestion: str


class InterviewAnswerRequest(BaseModel):
    questionId: str
    answer: str


class QuestionFeedback(BaseModel):
    questionId: str
    question: str
    answer: str
    score: float
    feedback: str
    betterAnswer: Optional[str] = None


class InterviewReport(BaseModel):
    sessionId: str
    role: str
    scores: SessionScores
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    questionFeedback: List[QuestionFeedback]
    overallSummary: str
    recommendation: str  # strong_yes | yes | maybe | no
    generatedAt: str
