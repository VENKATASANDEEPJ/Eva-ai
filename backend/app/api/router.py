from fastapi import APIRouter
from app.api.v1 import auth, sessions, chat, interview, progress

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(sessions.router)
api_router.include_router(chat.router)
api_router.include_router(interview.router)
api_router.include_router(progress.router)
