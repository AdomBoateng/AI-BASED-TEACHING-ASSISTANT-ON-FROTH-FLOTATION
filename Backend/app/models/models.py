from pydantic import BaseModel, EmailStr


class RagTurnRequest(BaseModel):
    session_id: str
    mode: str = "learn"  # learn only here
    message: str


class ModeSessionStartRequest(BaseModel):
    session_id: str
    mode: str
    session_type: str
    difficulty: str = "Basic"
    total_items: int | None = None


class ModeSessionTurnRequest(BaseModel):
    message: str


class VideoToggle(BaseModel):
    prefers_video: bool


class SignUpPayload(BaseModel):
    email: EmailStr
    password: str


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordPayload(BaseModel):
    email: EmailStr
    redirect_to: str | None = None
