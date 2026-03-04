from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
import re
import httpx
from datetime import datetime, timezone, timedelta
import random

# ------------------------------
# ENV LOAD + CONFIG
# ------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

ADMIN_PASSCODE = os.getenv("ADMIN_PASSCODE")
mongo_url = os.getenv("MONGO_URI")
OTP_DEBUG_MODE = os.getenv("OTP_DEBUG_MODE", "true").lower() == "true"

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
    registration_number: str
    section: str
    year: int


class AppointmentOtpVerify(BaseModel):
    appointment_id: str
    otp_code: str

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


@api_router.post("/appointments")
async def create_appointment(appointment: AppointmentCreate):
    student_name = appointment.student_name.strip()
    registration_number = appointment.registration_number.strip().upper()
    section = appointment.section.strip().upper()

    if len(student_name) < 2:
        raise HTTPException(status_code=400, detail="Student name must be at least 2 characters.")

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

    otp_code = str(random.randint(100000, 999999))
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=10)
    appointment_id = str(uuid.uuid4())

    appointment_doc = {
        "id": appointment_id,
        "faculty_id": appointment.faculty_id,
        "student_name": student_name,
        "registration_number": registration_number,
        "section": section,
        "year": appointment.year,
        "otp_code": otp_code,
        "otp_verified": False,
        "status": "pending_otp_verification",
        "otp_attempts": 0,
        "otp_expires_at": expires_at,
        "created_at": now,
    }

    await db.appointments.insert_one(appointment_doc)

    response = {
        "message": "Appointment request submitted. OTP verification required.",
        "appointment_id": appointment_id,
        "otp_required": True,
        "otp_expires_at": expires_at,
    }

    if OTP_DEBUG_MODE:
        response["otp_code"] = otp_code

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

    now = datetime.now(timezone.utc)
    expires_at = appointment.get("otp_expires_at")
    if not expires_at or now > expires_at:
        await db.appointments.update_one(
            {"id": payload.appointment_id},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=400, detail="OTP expired. Please submit a new appointment request.")

    if appointment.get("otp_code") != otp_value:
        await db.appointments.update_one(
            {"id": payload.appointment_id},
            {"$inc": {"otp_attempts": 1}}
        )
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    await db.appointments.update_one(
        {"id": payload.appointment_id},
        {"$set": {"otp_verified": True, "status": "confirmed"}}
    )

    return {"message": "OTP verified successfully. Appointment confirmed.", "status": "confirmed"}

@api_router.post("/admin/verify")
async def verify_admin(x_admin_passcode: str = Header(None)):
    if not x_admin_passcode:
        raise HTTPException(status_code=400, detail="Passcode header missing")

    if x_admin_passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=401, detail="Invalid admin passcode")

    return {"status": "success"}

@api_router.get("/admin/stats")
async def admin_stats(x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)

    papers_count = await db.papers.count_documents({})
    requests_count = await db.requests.count_documents({})

    return {
        "papers_count": papers_count,
        "requests_count": requests_count,
    }

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
