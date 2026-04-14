from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.db.mongodb import get_database
from app.models.schemas import Appointment, AppointmentCreate, AppointmentOtpVerify, AppointmentStatusUpdate
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["Appointments"])

# Public booking flow
@router.post("")
async def create_appointment(appointment: AppointmentCreate, db = Depends(get_database)):
    return await appointment_service.create_appointment(db, appointment)

# Public OTP verification
@router.post("/verify-otp")
async def verify_appointment_otp(payload: AppointmentOtpVerify, db = Depends(get_database)):
    return await appointment_service.verify_appointment_otp(db, payload)

# Public: Fetch appointments for a specific faculty (Student view - only confirmed)
@router.get("/faculty/{faculty_id}", response_model=List[Appointment])
async def get_faculty_appointments_public(faculty_id: str, db = Depends(get_database)):
    return await appointment_service.get_faculty_appointments(db, faculty_id)

# Protected status update
@router.patch("/{appointment_id}/status")
async def update_status(appointment_id: str, payload: AppointmentStatusUpdate, db = Depends(get_database)):
    return await appointment_service.update_appointment_status(db, appointment_id, payload)
