from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.db.mongodb import get_database
from app.models.schemas import FacultyPublicProfile, FacultyProfileUpdate, Appointment
from app.services import faculty_service, appointment_service
from app.core.security import get_current_faculty

router = APIRouter(prefix="/faculty", tags=["Faculty"])

# --- PROTECTED: Current faculty info (PRIORITY) ---
@router.get("/me", response_model=dict)
async def get_my_profile(current_faculty = Depends(get_current_faculty)):
    # Returns the personal profile of the authenticated faculty member
    return current_faculty

@router.get("/me/appointments", response_model=List[Appointment])
async def get_my_appointments(
    status: str = None,
    limit: int = 100,
    skip: int = 0,
    db = Depends(get_database), 
    current_faculty = Depends(get_current_faculty)
):
    # Faculty ONLY views their own appointments
    return await appointment_service.get_faculty_appointments(
        db, 
        current_faculty["id"],
        status=status,
        limit=limit,
        skip=skip
    )

@router.post("/profile", response_model=dict)
async def update_profile(
    profile: FacultyProfileUpdate, 
    db = Depends(get_database),
    current_faculty = Depends(get_current_faculty)
):
    # identification via JWT sub (current_faculty['id'])
    return await faculty_service.create_or_update_profile(
        db, 
        current_faculty["id"], 
        profile
    )

# --- PUBLIC: List complete profiles ONLY ---
@router.get("", response_model=List[FacultyPublicProfile])
async def list_faculty(db = Depends(get_database)):
    # SECURITY: Service already ignores 'email' for public list
    return await faculty_service.get_all_faculty(db)

# PUBLIC: Specific profile detail
@router.get("/{faculty_id}", response_model=FacultyPublicProfile)
async def get_faculty_details(faculty_id: str, db = Depends(get_database)):
    # SECURITY: Service already ignores 'email' for public detail
    return await faculty_service.get_faculty_by_id(db, faculty_id)
