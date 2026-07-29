from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.core.dependencies import CurrentUser, DB
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.models.user import User
from app.schemas.auth import GoogleLoginRequest, RefreshTokenRequest, AuthResponse, TokenResponse
from app.schemas.user import UserResponse, UpdateSettingsRequest
from app.schemas.common import APIResponse, ok, err
from app.services.google_auth import verify_google_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=APIResponse[AuthResponse])
async def google_login(body: GoogleLoginRequest, db: DB):
    """Exchange a Google ID token for Eva JWT tokens."""
    payload = await verify_google_token(body.credential)

    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    google_sub = payload.get("sub", "")
    email = payload.get("email", "")
    name = payload.get("name", email.split("@")[0])
    avatar = payload.get("picture")

    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not provided by Google")

    # Find or create user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            name=name,
            avatar=avatar,
            google_sub=google_sub,
        )
        db.add(user)
        await db.flush()
    else:
        # Update profile info
        user.name = name
        user.avatar = avatar
        if not user.google_sub:
            user.google_sub = google_sub
        await db.flush()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return ok(
        AuthResponse(
            user=UserResponse.from_orm_user(user),
            accessToken=access_token,
            refreshToken=refresh_token,
        ),
        message="Login successful",
    )


@router.post("/refresh", response_model=APIResponse[TokenResponse])
async def refresh_tokens(body: RefreshTokenRequest, db: DB):
    """Get a new access token using a refresh token."""
    user_id = verify_token(body.refreshToken, token_type="refresh")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return ok(
        TokenResponse(
            accessToken=create_access_token(user.id),
            refreshToken=create_refresh_token(user.id),
        )
    )


@router.post("/logout")
async def logout():
    """Client-side logout — tokens are stateless so just acknowledge."""
    return ok(None, "Logged out successfully")


@router.get("/me", response_model=APIResponse[UserResponse])
async def get_me(current_user: CurrentUser):
    """Return the authenticated user's profile."""
    return ok(UserResponse.from_orm_user(current_user))


@router.patch("/settings", response_model=APIResponse[UserResponse])
async def update_settings(body: UpdateSettingsRequest, current_user: CurrentUser, db: DB):
    """Update user settings."""
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        if hasattr(current_user, key):
            setattr(current_user, key, value)
    await db.flush()
    return ok(UserResponse.from_orm_user(current_user))
