from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from app.core.dependencies import CurrentUser, DB
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.models.user import User
from app.schemas.auth import GoogleLoginRequest, RefreshTokenRequest, TokenResponse
from app.schemas.user import UserResponse, UpdateSettingsRequest
from app.services.google_auth import verify_google_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_response(user: User, message: str = "OK") -> JSONResponse:
    """Build a camelCase JSON login response."""
    user_data = UserResponse.from_orm_user(user).model_dump(by_alias=True)
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    return JSONResponse(
        content=jsonable_encoder(
            {
                "success": True,
                "message": message,
                "data": {
                    "user": user_data,
                    "accessToken": access_token,
                    "refreshToken": refresh_token,
                },
            }
        )
    )


def _user_response(user: User, message: str = "OK") -> JSONResponse:
    """Build a camelCase JSON user response."""
    user_data = UserResponse.from_orm_user(user).model_dump(by_alias=True)
    return JSONResponse(
        content={
            "success": True,
            "message": message,
            "data": user_data,
        }
    )


@router.post("/google")
async def google_login(body: GoogleLoginRequest, db: DB):
    """Exchange a Google ID token for Eva JWT tokens."""
    payload = await verify_google_token(body.credential)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token"
        )

    email = payload.get("email", "")
    name = payload.get("name", email.split("@")[0])
    avatar = payload.get("picture")
    google_sub = payload.get("sub", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email, name=name, avatar=avatar, google_sub=google_sub)
        db.add(user)
        await db.flush()
    else:
        user.name = name
        user.avatar = avatar
        if not user.google_sub:
            user.google_sub = google_sub
        await db.flush()

    return _auth_response(user, "Login successful")


@router.post("/refresh")
async def refresh_tokens(body: RefreshTokenRequest, db: DB):
    user_id = verify_token(body.refreshToken, token_type="refresh")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    return JSONResponse(
        content={
            "success": True,
            "message": "OK",
            "data": {
                "accessToken": create_access_token(user.id),
                "refreshToken": create_refresh_token(user.id),
            },
        }
    )


@router.post("/logout")
async def logout():
    return JSONResponse(
        content={"success": True, "message": "Logged out successfully", "data": None}
    )


@router.get("/me")
async def get_me(current_user: CurrentUser):
    return _user_response(current_user)


@router.patch("/settings")
async def update_settings(
    body: UpdateSettingsRequest, current_user: CurrentUser, db: DB
):
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        if hasattr(current_user, key):
            setattr(current_user, key, value)
    await db.flush()
    return _user_response(current_user)
