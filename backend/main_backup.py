from fastapi import FastAPI, APIRouter, HTTPException, Header, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
import re
import httpx
from datetime import datetime, timezone, timedelta
import secrets
import hashlib
import smtplib
from email.message import EmailMessage
import asyncio

# ------------------------------
# ENV LOAD + CONFIG
# ------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

ADMIN_PASSCODE = os.getenv("ADMIN_PASSCODE")
mongo_url = os.getenv("MONGO_URI")
OTP_DEBUG_MODE = os.getenv("OTP_DEBUG_MODE", "true").lower() == "true"
OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "10"))
COLLEGE_EMAIL_DOMAIN = os.getenv("COLLEGE_EMAIL_DOMAIN", "").strip().lower()
APPOINTMENT_OTP_TTL_MINUTES = 5
OTP_RATE_LIMIT_WINDOW_MINUTES = int(os.getenv("OTP_RATE_LIMIT_WINDOW_MINUTES", "15"))
OTP_RATE_LIMIT_MAX_REQUESTS = int(os.getenv("OTP_RATE_LIMIT_MAX_REQUESTS", "3"))
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME).strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

client = AsyncIOMotorClient(mongo_url)
db = client[os.getenv("DB_NAME")]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ------------------------------
# AUTH CHECK
# ------------------------------
async def check_admin(passcode: str):
    if passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=401, detail="Unauthorized")

# ------------------------------
# GOOGLE DRIVE HELPERS
# ------------------------------
DRIVE_ID_REGEX = r"/d/([a-zA-Z0-9_-]+)"

async def is_drive_file_public(file_id: str) -> bool:
    test_url = f"https://drive.google.com/uc?export=download&id={file_id}"

    async with httpx.AsyncClient(follow_redirects=False, timeout=10) as client:
        response = await client.head(test_url)
        location = response.headers.get("location", "")
        if "accounts.google.com" in location:
            return False
        return response.status_code in (200, 302)

async def normalize_and_validate_drive_url(url: str) -> str:
    match = re.search(DRIVE_ID_REGEX, url)

    if not match:
        return url

    file_id = match.group(1)

    if not await is_drive_file_public(file_id):
        raise HTTPException(
            status_code=400,
            detail="Google Drive file is not public. Set access to 'Anyone with the link'."
        )

    return f"https://drive.google.com/uc?export=download&id={file_id}"

# ------------------------------
# MODELS
# ------------------------------
class Paper(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    department: str
    year: int
    pdfUrl: str
    type: str


class PaperUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    pdfUrl: Optional[str] = None
    type: Optional[str] = None


class Faculty(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    image: Optional[str] = None
    cabin_number: str
    department: str
    available_time_slots: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None
    cabin_number: Optional[str] = None
    department: Optional[str] = None
    available_time_slots: Optional[List[str]] = None


class AppointmentCreate(BaseModel):
    faculty_id: str
    student_name: str
    student_email: str
    registration_number: str
    section: str
    year: int


class AppointmentOtpVerify(BaseModel):
    appointment_id: str
    otp_code: str


class AppointmentStatusUpdate(BaseModel):
    faculty_id: str
    appointment_status: Literal["accepted", "rejected"]
    meeting_time: Optional[datetime] = None


class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_name: str
    registration_number: str
    section: str
    year: int
    faculty_id: str
    appointment_status: Literal["pending", "accepted", "rejected"] = "pending"
    requested_time: datetime
    meeting_time: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OtpSendRequest(BaseModel):
    destination: str
    purpose: str = "generic"
    ttl_minutes: int = OTP_TTL_MINUTES


class OtpVerifyRequest(BaseModel):
    otp_id: str
    otp_code: str
    purpose: str = "generic"


class AppNotification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "appointment_confirmed"
    appointment_id: str
    student_email: str
    student_name: str
    faculty_id: str
    faculty_name: str
    cabin_number: str
    meeting_time: datetime
    title: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def hash_otp(otp_code: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{otp_code}".encode("utf-8")).hexdigest()


def smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM_EMAIL)


def is_email(value: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value))


def is_college_email(value: str) -> bool:
    if not is_email(value):
        return False

    if COLLEGE_EMAIL_DOMAIN:
        return value.endswith(f"@{COLLEGE_EMAIL_DOMAIN}")

    # Fallback when a specific college domain is not configured.
    return bool(re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|edu\.in|ac\.in)$", value))


def mask_destination(destination: str) -> str:
    if is_email(destination):
        local, domain = destination.split("@", 1)
        if len(local) <= 2:
            return f"{local[0]}***@{domain}" if local else f"***@{domain}"
        return f"{local[0]}***{local[-1]}@{domain}"
    if len(destination) <= 4:
        return "*" * len(destination)
    return f"{destination[:2]}{'*' * max(1, len(destination) - 4)}{destination[-2:]}"


def send_email_sync(destination: str, otp_code: str, purpose: str, expires_in_minutes: int):
    message = EmailMessage()
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = destination
    message["Subject"] = "Your OTP Code"
    message.set_content(
        f"Your OTP for {purpose.replace('_', ' ')} is {otp_code}. "
        f"It expires in {expires_in_minutes} minutes."
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
        if SMTP_USE_TLS:
            smtp.starttls()
        if SMTP_USERNAME:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)


def send_appointment_confirmation_email_sync(
    destination: str,
    student_name: str,
    faculty_name: str,
    cabin_number: str,
    meeting_time: datetime,
):
    message = EmailMessage()
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = destination
    message["Subject"] = "Appointment Confirmed"
    message.set_content(
        f"Hello {student_name},\n\n"
        f"Your appointment has been confirmed.\n"
        f"Faculty: {faculty_name}\n"
        f"Cabin Number: {cabin_number}\n"
        f"Meeting Time: {meeting_time.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n\n"
        "Please be available on time.\n"
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
        if SMTP_USE_TLS:
            smtp.starttls()
        if SMTP_USERNAME:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)


async def deliver_otp(destination: str, otp_code: str, purpose: str, expires_in_minutes: int) -> str:
    if smtp_configured() and is_email(destination):
        try:
            await asyncio.to_thread(
                send_email_sync,
                destination,
                otp_code,
                purpose,
                expires_in_minutes,
            )
            return "email_sent"
        except Exception as exc:
            logging.exception("OTP email delivery failed: %s", exc)
            return "delivery_failed"

    logging.info("OTP generated for %s (%s): %s", destination, purpose, otp_code)
    return "logged"


async def deliver_appointment_confirmation(
    destination: str,
    student_name: str,
    faculty_name: str,
    cabin_number: str,
    meeting_time: datetime,
) -> str:
    if smtp_configured() and is_email(destination):
        try:
            await asyncio.to_thread(
                send_appointment_confirmation_email_sync,
                destination,
                student_name,
                faculty_name,
                cabin_number,
                meeting_time,
            )
            return "email_sent"
        except Exception as exc:
            logging.exception("Appointment confirmation email failed: %s", exc)
            return "delivery_failed"

    logging.info(
        "Appointment confirmed for %s (%s, cabin %s) at %s",
        destination,
        faculty_name,
        cabin_number,
        meeting_time.isoformat(),
    )
    return "logged"


async def create_app_notification(
    appointment_id: str,
    student_email: str,
    student_name: str,
    faculty_id: str,
    faculty_name: str,
    cabin_number: str,
    meeting_time: datetime,
) -> str:
    title = "Appointment Confirmed"
    message = (
        f"Your appointment with {faculty_name} is confirmed for "
        f"{meeting_time.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} "
        f"at cabin {cabin_number}."
    )

    notification = AppNotification(
        appointment_id=appointment_id,
        student_email=student_email,
        student_name=student_name,
        faculty_id=faculty_id,
        faculty_name=faculty_name,
        cabin_number=cabin_number,
        meeting_time=meeting_time,
        title=title,
        message=message,
    )
    await db.notifications.insert_one(notification.model_dump())
    return "created"


async def create_otp_session(destination: str, purpose: str, ttl_minutes: int = OTP_TTL_MINUTES):
    if ttl_minutes < 1 or ttl_minutes > 30:
        raise HTTPException(status_code=400, detail="OTP TTL must be between 1 and 30 minutes.")

    now = datetime.now(timezone.utc)
    rate_window_start = now - timedelta(minutes=OTP_RATE_LIMIT_WINDOW_MINUTES)
    recent_otp_count = await db.otp_sessions.count_documents(
        {
            "destination": destination,
            "purpose": purpose,
            "created_at": {"$gte": rate_window_start},
        }
    )
    if recent_otp_count >= OTP_RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Too many OTP requests. Try again after {OTP_RATE_LIMIT_WINDOW_MINUTES} minutes."
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
        if delivery_status != "email_sent" and not OTP_DEBUG_MODE:
            await db.otp_sessions.delete_one({"id": otp_id})
            raise HTTPException(
                status_code=500,
                detail="OTP email delivery is not configured. Please contact support."
            )

    return {
        "otp_id": otp_id,
        "expires_at": expires_at,
        "delivery_status": delivery_status,
        "otp_code": otp_code if OTP_DEBUG_MODE else None,
    }


async def verify_otp_session(otp_id: str, otp_code: str, purpose: str):
    otp_session = await db.otp_sessions.find_one({"id": otp_id})
    if not otp_session:
        raise HTTPException(status_code=404, detail="OTP session not found.")

    if otp_session.get("purpose") != purpose:
        raise HTTPException(status_code=400, detail="OTP purpose mismatch.")

    if otp_session.get("verified"):
        return {"message": "OTP already verified.", "status": "verified"}

    now = datetime.now(timezone.utc)
    expires_at = otp_session.get("expires_at")
    attempts = int(otp_session.get("attempts", 0))
    max_attempts = int(otp_session.get("max_attempts", 5))

    if not expires_at or now > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired.")

    if attempts >= max_attempts:
        raise HTTPException(status_code=400, detail="OTP verification attempts exceeded.")

    expected_hash = otp_session.get("otp_hash", "")
    salt = otp_session.get("otp_salt", "")
    if hash_otp(otp_code.strip(), salt) != expected_hash:
        await db.otp_sessions.update_one({"id": otp_id}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    await db.otp_sessions.update_one(
        {"id": otp_id},
        {"$set": {"verified": True, "verified_at": now}},
    )

    return {"message": "OTP verified successfully.", "status": "verified"}

# ------------------------------
# ROOT
# ------------------------------
@api_router.get("/")
async def root():
    return {"message": "Student Toolkit API"}

# ------------------------------
# PAPERS CRUD
# ------------------------------
@api_router.get("/papers", response_model=List[Paper])
async def get_papers():
    return await db.papers.find({}, {"_id": 0}).to_list(1000)


@api_router.post("/papers", response_model=Paper)
async def add_paper(paper: Paper, x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    paper.pdfUrl = await normalize_and_validate_drive_url(paper.pdfUrl)
    await db.papers.insert_one(paper.model_dump())
    return paper


@api_router.put("/papers/{paper_id}", response_model=Paper)
async def update_paper(
    paper_id: str,
    paper: PaperUpdate,
    x_admin_passcode: str = Header(None),
):
    await check_admin(x_admin_passcode)

    update_data = {k: v for k, v in paper.model_dump().items() if v is not None}

    if "year" in update_data:
        try:
            update_data["year"] = int(update_data["year"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Year must be a number")

    if "pdfUrl" in update_data:
        update_data["pdfUrl"] = await normalize_and_validate_drive_url(update_data["pdfUrl"])

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided")

    result = await db.papers.find_one_and_update(
        {"id": paper_id},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )

    if not result:
        raise HTTPException(status_code=404, detail="Paper not found")

    return result


@api_router.delete("/papers/{paper_id}")
async def delete_paper(paper_id: str, x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    result = await db.papers.delete_one({"id": paper_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paper not found")

    return {"message": "Paper deleted successfully"}

# ------------------------------
# FILTERS (Years / Dept / Subjects)
# ------------------------------
@api_router.get("/filters")
async def get_filters():
    papers = await db.papers.find({}, {"_id": 0}).to_list(1000)

    years = sorted(list(set(p["year"] for p in papers)), reverse=True)
    departments = sorted(list(set(p["department"] for p in papers)))
    subjects = sorted(list(set(p["subject"] for p in papers)))

    return {
        "years": years,
        "departments": departments,
        "subjects": subjects,
    }


@api_router.get("/faculty", response_model=List[Faculty])
async def get_faculty():
    return await db.faculty.find({}, {"_id": 0}).to_list(1000)


@api_router.get("/faculty/{faculty_id}", response_model=Faculty)
async def get_faculty_by_id(faculty_id: str):
    faculty = await db.faculty.find_one({"id": faculty_id}, {"_id": 0})

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    return faculty


@api_router.post("/otp/send")
async def otp_send(payload: OtpSendRequest):
    destination = payload.destination.strip()
    if not destination:
        raise HTTPException(status_code=400, detail="OTP destination is required.")

    otp_session = await create_otp_session(
        destination=destination,
        purpose=payload.purpose.strip() or "generic",
        ttl_minutes=payload.ttl_minutes,
    )

    response = {
        "message": "OTP created successfully.",
        "otp_id": otp_session["otp_id"],
        "expires_at": otp_session["expires_at"],
        "delivery_status": otp_session["delivery_status"],
        "destination": mask_destination(destination),
    }
    if OTP_DEBUG_MODE and otp_session.get("otp_code"):
        response["otp_code"] = otp_session["otp_code"]
    return response


@api_router.post("/otp/verify")
async def otp_verify(payload: OtpVerifyRequest):
    otp_value = payload.otp_code.strip()
    if not re.match(r"^\d{6}$", otp_value):
        raise HTTPException(status_code=400, detail="OTP must be a 6-digit code.")

    result = await verify_otp_session(
        otp_id=payload.otp_id,
        otp_code=otp_value,
        purpose=payload.purpose.strip() or "generic",
    )
    return result


@api_router.post("/appointments")
async def create_appointment(appointment: AppointmentCreate):
    student_name = appointment.student_name.strip()
    student_email = appointment.student_email.strip().lower()
    registration_number = appointment.registration_number.strip().upper()
    section = appointment.section.strip().upper()

    if len(student_name) < 2:
        raise HTTPException(status_code=400, detail="Student name must be at least 2 characters.")

    if not is_college_email(student_email):
        raise HTTPException(status_code=400, detail="Enter a valid college email address.")

    if COLLEGE_EMAIL_DOMAIN and not student_email.endswith(f"@{COLLEGE_EMAIL_DOMAIN}"):
        raise HTTPException(
            status_code=400,
            detail=f"Use your college email ending with @{COLLEGE_EMAIL_DOMAIN}."
        )

    if not re.match(r"^[A-Z0-9-]{4,20}$", registration_number):
        raise HTTPException(
            status_code=400,
            detail="Registration number must be 4-20 characters and contain only letters, numbers, or hyphen."
        )

    if not re.match(r"^[A-Z0-9]{1,10}$", section):
        raise HTTPException(
            status_code=400,
            detail="Section must be 1-10 characters and contain only letters or numbers."
        )

    if appointment.year < 1 or appointment.year > 6:
        raise HTTPException(status_code=400, detail="Year must be between 1 and 6.")

    faculty = await db.faculty.find_one({"id": appointment.faculty_id}, {"_id": 0, "id": 1})
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found.")

    now = datetime.now(timezone.utc)
    active_duplicate = await db.appointments.find_one(
        {
            "faculty_id": appointment.faculty_id,
            "$and": [
                {
                    "$or": [
                        {"student_email": student_email},
                        {"registration_number": registration_number},
                    ]
                },
                {
                    "$or": [
                        {"appointment_status": {"$in": ["pending", "accepted"]}},
                        {
                            "otp_verified": False,
                            "otp_expires_at": {"$gt": now},
                        },
                    ]
                },
            ],
        },
        {"_id": 0, "id": 1},
    )
    if active_duplicate:
        raise HTTPException(
            status_code=409,
            detail="Duplicate appointment request detected. Please wait for faculty response.",
        )

    otp_destination = student_email
    otp_session = await create_otp_session(
        destination=otp_destination,
        purpose="appointment_verification",
        ttl_minutes=APPOINTMENT_OTP_TTL_MINUTES,
    )

    appointment_id = str(uuid.uuid4())

    appointment_doc = Appointment(
        id=appointment_id,
        student_name=student_name,
        registration_number=registration_number,
        section=section,
        year=appointment.year,
        faculty_id=appointment.faculty_id,
        appointment_status="pending",
        requested_time=now,
        meeting_time=None,
        created_at=now,
    ).model_dump()
    appointment_doc.update({
        "faculty_id": appointment.faculty_id,
        "student_email": student_email,
        "otp_session_id": otp_session["otp_id"],
        "otp_verified": False,
        "otp_attempts": 0,
        "otp_expires_at": otp_session["expires_at"],
    })

    await db.appointments.insert_one(appointment_doc)

    response = {
        "message": "Appointment request submitted. OTP verification required.",
        "appointment_id": appointment_id,
        "otp_required": True,
        "otp_expires_at": otp_session["expires_at"],
        "otp_delivery_status": otp_session["delivery_status"],
        "otp_destination": mask_destination(student_email),
    }

    if OTP_DEBUG_MODE and otp_session.get("otp_code"):
        response["otp_code"] = otp_session["otp_code"]

    return response


@api_router.post("/appointments/verify-otp")
async def verify_appointment_otp(payload: AppointmentOtpVerify):
    otp_value = payload.otp_code.strip()
    if not re.match(r"^\d{6}$", otp_value):
        raise HTTPException(status_code=400, detail="OTP must be a 6-digit code.")

    appointment = await db.appointments.find_one({"id": payload.appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if appointment.get("otp_verified"):
        return {"message": "OTP already verified.", "status": "confirmed"}

    otp_session_id = appointment.get("otp_session_id")
    if not otp_session_id:
        raise HTTPException(status_code=400, detail="OTP session missing for this appointment.")

    await verify_otp_session(
        otp_id=otp_session_id,
        otp_code=otp_value,
        purpose="appointment_verification",
    )

    await db.appointments.update_one(
        {"id": payload.appointment_id},
        {"$set": {"otp_verified": True, "appointment_status": "pending"}}
    )

    return {"message": "OTP verified successfully. Appointment confirmed.", "status": "confirmed"}


@api_router.get("/faculty/{faculty_id}/appointments", response_model=List[Appointment])
async def get_faculty_appointments(faculty_id: str):
    faculty = await db.faculty.find_one({"id": faculty_id}, {"_id": 0, "id": 1})
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found.")

    appointments = await db.appointments.find(
        {"faculty_id": faculty_id, "otp_verified": True},
        {"_id": 0},
    ).sort("created_at", -1).to_list(1000)

    return appointments


@api_router.patch("/appointments/{appointment_id}/status")
async def update_appointment_status(appointment_id: str, payload: AppointmentStatusUpdate):
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "faculty_id": payload.faculty_id},
        {"_id": 0},
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if not appointment.get("otp_verified"):
        raise HTTPException(status_code=400, detail="Appointment is not OTP verified yet.")

    update_fields = {
        "appointment_status": payload.appointment_status,
    }

    if payload.appointment_status == "accepted":
        if payload.meeting_time is None:
            raise HTTPException(status_code=400, detail="Meeting time is required when accepting an appointment.")
        update_fields["meeting_time"] = payload.meeting_time
    else:
        update_fields["meeting_time"] = None

    result = await db.appointments.find_one_and_update(
        {"id": appointment_id, "faculty_id": payload.faculty_id},
        {"$set": update_fields},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )

    notification_status = None
    app_notification_status = None
    if payload.appointment_status == "accepted" and result:
        faculty = await db.faculty.find_one(
            {"id": payload.faculty_id},
            {"_id": 0, "name": 1, "cabin_number": 1},
        )

        student_email = result.get("student_email", "").strip().lower()
        student_name = result.get("student_name", "Student")
        meeting_time = result.get("meeting_time")
        faculty_name = (faculty or {}).get("name", "Faculty")
        cabin_number = (faculty or {}).get("cabin_number", "Not assigned")

        if meeting_time and student_email:
            notification_status = await deliver_appointment_confirmation(
                destination=student_email,
                student_name=student_name,
                faculty_name=faculty_name,
                cabin_number=cabin_number,
                meeting_time=meeting_time,
            )
            app_notification_status = await create_app_notification(
                appointment_id=appointment_id,
                student_email=student_email,
                student_name=student_name,
                faculty_id=payload.faculty_id,
                faculty_name=faculty_name,
                cabin_number=cabin_number,
                meeting_time=meeting_time,
            )
        else:
            notification_status = "skipped"
            app_notification_status = "skipped"

    return {
        "message": f"Appointment {payload.appointment_status} successfully.",
        "appointment": result,
        "email_notification_status": notification_status,
        "app_notification_status": app_notification_status,
    }


@api_router.get("/notifications", response_model=List[AppNotification])
async def get_student_notifications(student_email: str = Query(...)):
    email = student_email.strip().lower()
    if not is_email(email):
        raise HTTPException(status_code=400, detail="Valid student email is required.")

    notifications = await db.notifications.find(
        {"student_email": email},
        {"_id": 0},
    ).sort("created_at", -1).to_list(1000)
    return notifications

@api_router.post("/admin/verify")
async def verify_admin(x_admin_passcode: str = Header(None)):
    if not x_admin_passcode:
        raise HTTPException(status_code=400, detail="Passcode header missing")

    if x_admin_passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=401, detail="Invalid admin passcode")

    return {"status": "success"}

async def build_admin_stats():
    papers_count = await db.papers.count_documents({})
    requests_count = await db.requests.count_documents({})

    return {
        "papers_count": papers_count,
        "requests_count": requests_count,
    }


@api_router.get("/admin/stats")
async def admin_stats_api(x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    return await build_admin_stats()


@app.get("/admin/stats")
async def admin_stats_root(x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    return await build_admin_stats()

# ------------------------------
# APP CONFIG
# ------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
