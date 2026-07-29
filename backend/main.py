"""
Eva AI Communication Mentor — FastAPI Backend
Entry point: uvicorn main:app --reload
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.database import create_tables
from app.core.logging import setup_logging, get_logger
from app.api.router import api_router

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown."""
    logger.info(f"Eva Backend starting — env={settings.app_env}")
    logger.info(f"Database: {settings.database_url[:40]}...")
    await create_tables()
    logger.info("Database tables verified ✓")
    yield
    logger.info("Eva Backend shutting down")


app = FastAPI(
    title="Eva API",
    description="Eva — AI Communication Mentor Backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# ── CORS ───────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Error handlers ─────────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = []
    for e in exc.errors():
        field = " → ".join(str(x) for x in e["loc"])
        errors.append(f"{field}: {e['msg']}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "message": "; ".join(errors), "data": None},
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": "An unexpected error occurred", "data": None},
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "eva-api", "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "message": "Eva API is running",
        "docs": "/docs",
        "health": "/health",
    }
