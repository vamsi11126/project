from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.security import create_admin_session_token, verify_password


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


async def _enforce_login_rate_limit(db, email: str, ip_address: str):
    now = datetime.now(timezone.utc)
    rate_window_start = now - timedelta(minutes=settings.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MINUTES)
    recent_failures = await db.admin_login_attempts.count_documents(
        {
            "email": email,
            "ip_address": ip_address,
            "created_at": {"$gte": rate_window_start},
        }
    )

    if recent_failures >= settings.ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )


async def _record_failed_login(db, email: str, ip_address: str):
    await db.admin_login_attempts.insert_one(
        {
            "email": email,
            "ip_address": ip_address,
            "created_at": datetime.now(timezone.utc),
        }
    )


async def login_admin(db, request: Request, email: str, password: str):
    normalized_email = email.strip().lower()
    ip_address = _get_client_ip(request)

    await _enforce_login_rate_limit(db, normalized_email, ip_address)

    admin = await db.admins.find_one({"email": normalized_email})
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
    )

    if not admin or not admin.get("hashed_password") or not admin.get("is_active", True):
        await _record_failed_login(db, normalized_email, ip_address)
        raise invalid_credentials

    if not verify_password(password, admin["hashed_password"]):
        await _record_failed_login(db, normalized_email, ip_address)
        raise invalid_credentials

    now = datetime.now(timezone.utc)
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"last_login_at": now}},
    )
    await db.admin_login_attempts.delete_many(
        {
            "email": normalized_email,
            "ip_address": ip_address,
        }
    )

    token = create_admin_session_token(admin["id"])
    return {
        "token": token,
        "admin": {
            "id": admin["id"],
            "email": admin["email"],
            "name": admin["name"],
        },
    }
