from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.db.mongodb import get_database

ALGORITHM = "HS256"
FACULTY_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/faculty/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=FACULTY_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])


def create_admin_session_token(admin_id: str):
    expires_delta = timedelta(hours=settings.ADMIN_SESSION_DURATION_HOURS)
    return create_access_token(
        {"sub": admin_id, "role": "admin"},
        expires_delta=expires_delta,
    )


def set_admin_session_cookie(response: Response, token: str):
    response.set_cookie(
        key=settings.ADMIN_SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.ADMIN_SESSION_COOKIE_SECURE,
        samesite=settings.ADMIN_SESSION_COOKIE_SAMESITE,
        max_age=settings.ADMIN_SESSION_DURATION_HOURS * 60 * 60,
        path="/",
    )


def clear_admin_session_cookie(response: Response):
    response.delete_cookie(
        key=settings.ADMIN_SESSION_COOKIE_NAME,
        httponly=True,
        secure=settings.ADMIN_SESSION_COOKIE_SECURE,
        samesite=settings.ADMIN_SESSION_COOKIE_SAMESITE,
        path="/",
    )


async def get_current_faculty(token: str = Depends(oauth2_scheme), db=Depends(get_database)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        faculty_id: str = payload.get("sub")
        if faculty_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    faculty = await db.faculty_profiles.find_one({"id": faculty_id}, {"_id": 0})
    if faculty is None:
        raise credentials_exception
    return faculty


async def get_current_admin(request: Request, db=Depends(get_database)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin authentication required",
    )

    token = request.cookies.get(settings.ADMIN_SESSION_COOKIE_NAME)
    if not token:
        raise credentials_exception

    try:
        payload = decode_token(token)
        admin_id = payload.get("sub")
        role = payload.get("role")
        if admin_id is None or role != "admin":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    admin = await db.admins.find_one(
        {"id": admin_id, "is_active": True},
        {"_id": 0, "hashed_password": 0},
    )
    if admin is None:
        raise credentials_exception

    return admin


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")
