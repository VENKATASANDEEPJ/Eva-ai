"""
Verify Google OAuth2 ID tokens via Google's tokeninfo endpoint.
"""

from typing import Any
import httpx
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"


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
            logger.warning(
                f"Google tokeninfo returned {response.status_code}: {response.text[:200]}"
            )
            return None

        payload = response.json()

        # Check for error field (Google returns 200 with {"error": ...} on bad tokens)
        if "error" in payload or "error_description" in payload:
            logger.warning(
                f"Google token error: {payload.get('error_description', payload.get('error'))}"
            )
            return None

        # Validate audience — the token must have been issued for OUR client ID.
        # Google's tokeninfo returns aud as a string (the client ID).
        token_aud = payload.get("aud", "")
        configured_id = settings.google_client_id.strip()

        if configured_id and token_aud != configured_id:
            logger.warning(
                f"Google token audience mismatch: "
                f"token aud='{token_aud}' vs configured='{configured_id}'"
            )
            # In development, log a clear hint
            if not settings.is_production:
                logger.warning(
                    "HINT: Make sure frontend VITE_GOOGLE_CLIENT_ID and backend "
                    "GOOGLE_CLIENT_ID in .env are the SAME value."
                )
            return None

        # Validate email is present and verified
        # Note: Google tokeninfo returns email_verified as the string "true", not bool
        email = payload.get("email", "")
        email_verified = str(payload.get("email_verified", "false")).lower() == "true"

        if not email:
            logger.warning("Google token: no email in payload")
            return None

        if not email_verified:
            logger.warning(f"Google token: email not verified for {email}")
            return None

        logger.info(f"Google token verified for {email}")
        return payload

    except Exception as e:
        logger.error(f"Google token verification error: {e}")
        return None
