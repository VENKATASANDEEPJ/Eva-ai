from pydantic import BaseModel
from app.schemas.user import UserResponse


class GoogleLoginRequest(BaseModel):
    credential: str


class RefreshTokenRequest(BaseModel):
    refreshToken: str


class AuthResponse(BaseModel):
    user: UserResponse
    accessToken: str
    refreshToken: str


class TokenResponse(BaseModel):
    accessToken: str
    refreshToken: str
