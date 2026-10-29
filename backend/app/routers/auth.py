
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pwdlib import PasswordHash
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import (
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

password_hash = PasswordHash.recommended()


def create_access_token(user: User) -> tuple[str, int]:
    secret = os.getenv("JWT_SECRET_KEY")

    if not secret:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET_KEY is not configured",
        )

    expires_minutes = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
    expires_seconds = expires_minutes * 60

    now = datetime.now(timezone.utc)

    payload = {
        "sub": user.email,
        "iat": now,
        "exp": now + timedelta(seconds=expires_seconds),
    }

    token = jwt.encode(payload, secret, algorithm="HS256")

    return token, expires_seconds


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
)
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    user = User(
        name=payload.name.strip(),
        email=str(payload.email).lower(),
        hashed_password=password_hash.hash(payload.password),
        role="sales",
        is_active=True,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
        return user

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )


@router.post("/login", response_model=TokenResponse)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    email = str(payload.email).lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if (
        user is None
        or not user.is_active
        or not password_hash.verify(
            payload.password,
            user.hashed_password,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token, expires_seconds = create_access_token(user)

    return TokenResponse(
        access_token=token,
        expires_in=expires_seconds,
    )


@router.get("/me", response_model=UserResponse)
def get_me(
    user: User = Depends(get_current_user),
):
    return user
