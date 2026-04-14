from fastapi import APIRouter, Depends, HTTPException
import re
from app.db.mongodb import get_database
from app.models.schemas import OtpSendRequest, OtpVerifyRequest
from app.services import otp_service
from app.utils.validation import mask_destination as util_mask_destination
from app.core.config import settings

router = APIRouter(prefix="/otp", tags=["OTP"])

@router.post("/send")
async def otp_send(payload: OtpSendRequest, db = Depends(get_database)):
    destination = payload.destination.strip()
    if not destination:
        raise HTTPException(status_code=400, detail="OTP destination is required.")

    result = await otp_service.create_otp_session(
        db=db,
        destination=destination,
        purpose=payload.purpose.strip() or "generic",
        ttl_minutes=payload.ttl_minutes,
    )

    response = {
        "message": "OTP created successfully.",
        "otp_id": result["otp_id"],
        "expires_at": result["expires_at"],
        "delivery_status": result["delivery_status"],
        "destination": util_mask_destination(destination),
    }
    if settings.OTP_DEBUG_MODE and result.get("otp_code"):
        response["otp_code"] = result["otp_code"]
    return response

@router.post("/verify")
async def otp_verify(payload: OtpVerifyRequest, db = Depends(get_database)):
    otp_value = payload.otp_code.strip()
    if not re.match(r"^\d{6}$", otp_value):
        raise HTTPException(status_code=400, detail="OTP must be a 6-digit code.")

    return await otp_service.verify_otp_session(
        db=db,
        otp_id=payload.otp_id,
        otp_code=otp_value,
        purpose=payload.purpose.strip() or "generic",
    )
