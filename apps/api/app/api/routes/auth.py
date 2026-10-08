import secrets
import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenOut, UserOut
from app.services.email import send_verification_code

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        department=user.department,
        campus_verified=user.campus_verified,
        email_verified=user.email_verified,
        avatar_url=user.avatar_url,
        bio=user.bio,
        completed_transactions=user.completed_transactions or 0,
        avg_rating=float(user.avg_rating or 0),
        response_rate=float(user.response_rate or 0),
    )


def _gen_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="email already registered")

    code = _gen_code()
    user = User(
        name=body.name.strip(),
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        department=body.department,
        campus_verified=False,
        email_verified=False,
        verification_code_hash=_hash_code(code),
        verification_expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    send_verification_code(user.email, code, user.name)

    return TokenOut(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    return TokenOut(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenOut)
async def refresh(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="wrong token type")
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=401, detail="user not found")
    return TokenOut(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return _user_out(user)


class VerifyIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)


@router.post("/verify-email")
async def verify_email(
    body: VerifyIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.email_verified:
        return {"ok": True, "already": True}

    if not user.verification_code_hash or not user.verification_expires_at:
        raise HTTPException(400, "no verification code on file")

    if user.verification_expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "code expired — request a new one")

    if _hash_code(body.code.strip()) != user.verification_code_hash:
        raise HTTPException(400, "invalid code")

    user.email_verified = True
    user.verification_code_hash = None
    user.verification_expires_at = None
    # bonus: campus email => verified badge
    if user.email.endswith("@nmit.ac.in"):
        user.campus_verified = True

    await db.commit()
    return {"ok": True, "campus_verified": user.campus_verified}


@router.post("/resend-code")
async def resend_code(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.email_verified:
        return {"ok": True, "already": True}

    code = _gen_code()
    user.verification_code_hash = _hash_code(code)
    user.verification_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.commit()

    send_verification_code(user.email, code, user.name)
    return {"ok": True}
