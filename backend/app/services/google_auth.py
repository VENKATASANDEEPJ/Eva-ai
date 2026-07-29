"""
Verify Google OAuth2 ID tokens using Google's public keys.
"""
from typing import Any
import httpx
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"


async def verify_google_token(credential: str) -> dict[str, Any] | None:
    """
    Verify a Google ID token and return the payload if valid.
    Returns None if invalid.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                GOOGLE_TOKEN_INFO_URL,
                params={"id_token": credential},
            )

        if response.status_code != 200:
            logger.warning(f"Google token verification failed: {response.status_code}")
            return None

        payload = response.json()

        # Validate audience matches our client ID
        if settings.google_client_id and payload.get("aud") != settings.google_client_id:
            logger.warning("Google token audience mismatch")
            # In dev without a real client ID, we still allow it
            if settings.is_production:
                return None

        # Validate email is verified
        if not payload.get("email_verified"):
            logger.warning("Google token: email not verified")
            return None

        return payload

    except Exception as e:
        logger.error(f"Google token verification error: {e}")
        return None
