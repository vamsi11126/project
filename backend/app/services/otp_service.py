import uuid
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from app.core.config import settings
from app.utils.security import hash_otp
from app.utils.notifications import deliver_otp

async def create_otp_session(db, destination: str, purpose: str, ttl_minutes: int = None):
    if ttl_minutes is None:
        ttl_minutes = settings.OTP_TTL_MINUTES
        
    if ttl_minutes < 1 or ttl_minutes > 30:
        raise HTTPException(status_code=400, detail="OTP TTL must be between 1 and 30 minutes.")

    now = datetime.now(timezone.utc)
    rate_window_start = now - timedelta(minutes=settings.OTP_RATE_LIMIT_WINDOW_MINUTES)
    recent_otp_count = await db.otp_sessions.count_documents(
        {
            "destination": destination,
            "purpose": purpose,
            "created_at": {"$gte": rate_window_start},
        }
    )
    if recent_otp_count >= settings.OTP_RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Too many OTP requests. Try again after {settings.OTP_RATE_LIMIT_WINDOW_MINUTES} minutes."
            ),
        )

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    otp_id = str(uuid.uuid4())
    salt = str(uuid.uuid4())
    expires_at = now + timedelta(minutes=ttl_minutes)

    await db.otp_sessions.insert_one(
        {
            "id": otp_id,
            "destination": destination,
            "purpose": purpose,
            "otp_hash": hash_otp(otp_code, salt),
            "otp_salt": salt,
            "attempts": 0,
            "max_attempts": 5,
            "verified": False,
            "created_at": now,
            "expires_at": expires_at,
        }
    )

    delivery_status = await deliver_otp(destination, otp_code, purpose, ttl_minutes)

    if delivery_status == "delivery_failed":
        await db.otp_sessions.delete_one({"id": otp_id})
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again.")

    if purpose == "appointment_verification":
        if delivery_status != "email_sent" and not settings.OTP_DEBUG_MODE:
            await db.otp_sessions.delete_one({"id": otp_id})
            raise HTTPException(
                status_code=500,
                detail="OTP email delivery is not configured. Please contact support."
            )

    return {
        "otp_id": otp_id,
        "expires_at": expires_at,
        "delivery_status": delivery_status,
        "otp_code": otp_code if settings.OTP_DEBUG_MODE else None,
    }

async def verify_otp_session(db, otp_id: str, otp_code: str, purpose: str):
    otp_session = await db.otp_sessions.find_one({"id": otp_id})
    if not otp_session:
        raise HTTPException(status_code=404, detail="OTP session not found.")

    print(f"DEBUG: Verifying purpose '{purpose}' against session purpose '{otp_session.get('purpose')}'")
    if otp_session.get("purpose") != purpose:
        raise HTTPException(status_code=400, detail="OTP purpose mismatch.")

    if otp_session.get("verified"):
        return {"message": "OTP already verified.", "status": "verified"}

    now = datetime.now(timezone.utc)
    expires_at = otp_session.get("expires_at")
    attempts = int(otp_session.get("attempts", 0))
    max_attempts = int(otp_session.get("max_attempts", 5))

    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if not expires_at or now > expires_at:
        print(f"DEBUG: OTP {otp_id} expired. Now: {now}, Expires: {expires_at}")
        raise HTTPException(status_code=400, detail="OTP expired.")

    if attempts >= max_attempts:
        raise HTTPException(status_code=400, detail="OTP verification attempts exceeded.")

    expected_hash = otp_session.get("otp_hash", "")
    salt = otp_session.get("otp_salt", "")
    input_hash = hash_otp(otp_code.strip(), salt)
    
    print(f"DEBUG: Verifying OTP for {otp_id}")
    print(f"DEBUG: Input Hash: {input_hash[:10]}...")
    print(f"DEBUG: Expect Hash: {expected_hash[:10]}...")
    
    if input_hash != expected_hash:
        print("DEBUG: Hash check failed!")
        await db.otp_sessions.update_one({"id": otp_id}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    await db.otp_sessions.update_one(
        {"id": otp_id},
        {"$set": {"verified": True, "verified_at": now}},
    )

    return {"message": "OTP verified successfully.", "status": "verified"}
