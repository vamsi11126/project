import uuid
import re
from datetime import datetime, timezone
from fastapi import HTTPException
from app.core.config import settings
from app.utils.validation import is_college_email, mask_destination
from app.services.otp_service import create_otp_session, verify_otp_session
from app.models.schemas import Appointment, AppointmentCreate, AppointmentOtpVerify, AppointmentStatusUpdate
from app.utils.notifications import deliver_appointment_status
from app.services.notification_service import create_app_notification
from pymongo import ReturnDocument

# --- SERVICE LOGIC ---

async def create_appointment(db, appointment: AppointmentCreate):
    student_name = appointment.student_name.strip()
    student_email = appointment.student_email.strip().lower()
    registration_number = appointment.registration_number.strip().upper()
    section = appointment.section.strip().upper()
    chosen_slot = (appointment.chosen_slot or "").strip()

    # Basic validations
    if len(student_name) < 2:
        raise HTTPException(status_code=400, detail="Student name must be at least 2 characters.")
        
    if not is_college_email(student_email):
        raise HTTPException(status_code=400, detail="Enter a valid college email address.")
        
    if settings.COLLEGE_EMAIL_DOMAIN and not student_email.endswith(f"@{settings.COLLEGE_EMAIL_DOMAIN}"):
        raise HTTPException(status_code=400, detail=f"Use your college email ending with @{settings.COLLEGE_EMAIL_DOMAIN}.")
        
    if not re.match(r"^[A-Z0-9-]{4,30}$", registration_number):
        raise HTTPException(status_code=400, detail="Invalid registration number format.")
        
    if not re.match(r"^[A-Z0-9]{1,10}$", section):
        raise HTTPException(status_code=400, detail="Invalid section format.")

    # Faculty Slot Validation
    faculty = await db.faculty_profiles.find_one({"id": appointment.faculty_id})
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found.")
        
    if chosen_slot and chosen_slot not in faculty.get("available_time_slots", []):
        raise HTTPException(status_code=400, detail="Requested slot is not available for this faculty member.")

    now = datetime.now(timezone.utc)
    
    # Initiate OTP
    otp_session = await create_otp_session(
        db, destination=student_email, purpose="appointment_verification", ttl_minutes=5
    )

    # Create Appointment Entry
    appointment_id = str(uuid.uuid4())
    appointment_doc = Appointment(
        id=appointment_id,
        student_name=student_name,
        registration_number=registration_number,
        section=section,
        year=appointment.year,
        reason=appointment.reason,
        chosen_slot=chosen_slot,
        faculty_id=appointment.faculty_id,
        appointment_status="pending",
        requested_time=now,
        meeting_time=None,
        created_at=now,
        faculty_message=None
    ).model_dump()
    
    appointment_doc.update({
        "student_email": student_email,
        "otp_session_id": otp_session["otp_id"],
        "otp_verified": False,
        "otp_expires_at": otp_session["expires_at"],
    })

    await db.appointments.insert_one(appointment_doc)
    
    return {
        "message": "OTP verification required.",
        "appointment_id": appointment_id,
        "otp_destination": mask_destination(student_email),
    }

async def verify_appointment_otp(db, payload: AppointmentOtpVerify):
    appointment = await db.appointments.find_one({"id": payload.appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if appointment.get("otp_verified"):
        return {"message": "OTP verified.", "status": "confirmed"}

    await verify_otp_session(
        db, otp_id=appointment["otp_session_id"], otp_code=payload.otp_code, purpose="appointment_verification"
    )

    await db.appointments.update_one(
        {"id": payload.appointment_id},
        {"$set": {"otp_verified": True}}
    )
    return {"message": "OTP verified successfully.", "status": "confirmed"}

async def get_faculty_appointments(db, faculty_id: str, status: str = None, limit: int = 100, skip: int = 0):
    query = {"faculty_id": faculty_id, "otp_verified": True}
    if status:
        query["appointment_status"] = status

    return await db.appointments.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

async def update_appointment_status(db, appointment_id: str, payload: AppointmentStatusUpdate):
    appointment = await db.appointments.find_one({"id": appointment_id, "faculty_id": payload.faculty_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if payload.appointment_status == "accepted":
        conflict = await db.appointments.find_one({
            "faculty_id": payload.faculty_id,
            "chosen_slot": appointment.get("chosen_slot"),
            "appointment_status": "accepted",
            "id": {"$ne": appointment_id}
        })
        if conflict:
            raise HTTPException(status_code=409, detail="Another appointment is already confirmed for this slot.")

    update_fields = {
        "appointment_status": payload.appointment_status,
        "faculty_message": payload.faculty_message
    }
    
    if payload.appointment_status == "accepted":
        update_fields["meeting_time"] = payload.meeting_time or datetime.now(timezone.utc)

    result = await db.appointments.find_one_and_update(
        {"id": appointment_id},
        {"$set": update_fields},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0}
    )

    if result:
        faculty = await db.faculty_profiles.find_one({"id": payload.faculty_id})
        await deliver_appointment_status(
            destination=result["student_email"],
            student_name=result["student_name"],
            faculty_name=faculty.get("name", "Faculty"),
            cabin_number=faculty.get("cabin_number", "N/A"),
            status=payload.appointment_status,
            meeting_time=result.get("meeting_time"),
            faculty_message=payload.faculty_message
        )
        if payload.appointment_status == "accepted":
            await create_app_notification(
                db=db, appointment_id=appointment_id, student_email=result["student_email"],
                student_name=result["student_name"], faculty_id=payload.faculty_id,
                faculty_name=faculty.get("name", "Faculty"), cabin_number=faculty.get("cabin_number", "N/A"),
                meeting_time=result["meeting_time"]
            )

    return result
