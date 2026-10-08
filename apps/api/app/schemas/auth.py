from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    department: str | None = Field(default=None, max_length=60)

class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class RefreshIn(BaseModel):
    refresh_token: str

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    department: str | None = None
    campus_verified: bool = False
    email_verified: bool = False
    avatar_url: str | None = None
    bio: str | None = None
    completed_transactions: int = 0
    avg_rating: float = 0
    response_rate: float = 0

    class Config:
        from_attributes = True
