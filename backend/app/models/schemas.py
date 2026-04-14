from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid

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
    email: EmailStr
    image: Optional[str] = None
    cabin_number: str
    department: str
    available_time_slots: List[str] = Field(default_factory=list)
    is_complete: bool = False
    hashed_password: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"admin_{str(uuid.uuid4())[:8]}")
    email: EmailStr
    name: str
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: Optional[datetime] = None

class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
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
    reason: str
    chosen_slot: Optional[str] = None

class AppointmentOtpVerify(BaseModel):
    appointment_id: str
    otp_code: str

class AppointmentStatusUpdate(BaseModel):
    faculty_id: str
    appointment_status: Literal["accepted", "rejected"]
    meeting_time: Optional[datetime] = None
    faculty_message: Optional[str] = None

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_name: str
    registration_number: str
    section: str
    year: int
    reason: str
    chosen_slot: Optional[str] = None
    faculty_id: str
    appointment_status: Literal["pending", "accepted", "rejected"] = "pending"
    requested_time: datetime
    meeting_time: Optional[datetime] = None
    faculty_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OtpSendRequest(BaseModel):
    destination: str
    purpose: str = "generic"
    ttl_minutes: int = 10

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
    meeting_time: Optional[datetime] = None
    title: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- NEW AUTH & PROFILE SCHEMAS ---

class FacultyLoginRequest(BaseModel):
    email: str

class FacultyLoginVerify(BaseModel):
    otp_id: str
    otp_code: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    faculty_id: str

class FacultyPublicProfile(BaseModel):
    id: str
    name: str
    image: Optional[str] = None
    cabin_number: str
    department: str
    available_time_slots: List[str]

class FacultyProfileUpdate(BaseModel):
    name: Optional[str] = None
    image: Optional[str] = None
    cabin_number: Optional[str] = None
    department: Optional[str] = None
    available_time_slots: Optional[List[str]] = None

class FacultySetPassword(BaseModel):
    password: str

class FacultyPasswordLogin(BaseModel):
    email: str
    password: str

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class AdminPublic(BaseModel):
    id: str
    email: EmailStr
    name: str

class AdminLoginResponse(BaseModel):
    admin: AdminPublic

class AdminStats(BaseModel):
    papers_count: int
    faculty_count: int
    appointments_count: int
    pending_appointments_count: int
