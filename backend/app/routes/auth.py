from fastapi import APIRouter, Depends, HTTPException
from app.db.mongodb import get_database
from app.models.schemas import (
    FacultyLoginRequest, 
    FacultyLoginVerify, 
    Token, 
    FacultyPasswordLogin, 
    FacultySetPassword
)
from app.services import auth_service
from app.core.security import get_current_faculty

router = APIRouter(prefix="/auth/faculty", tags=["Authentication"])

@router.post("/login", response_model=dict)
async def login_request(payload: FacultyLoginRequest, db = Depends(get_database)):
    # Handles initial email check: returns if OTP or Password is required
    return await auth_service.request_faculty_login(db, payload.email)

@router.post("/verify", response_model=dict)
async def login_verify(payload: FacultyLoginVerify, db = Depends(get_database)):
    # Handles OTP verification for first-time login
    return await auth_service.verify_faculty_login(db, payload.otp_id, payload.otp_code)

@router.post("/password-login", response_model=Token)
async def credential_login(payload: FacultyPasswordLogin, db = Depends(get_database)):
    # Handles credential-based login for established accounts
    return await auth_service.login_with_password(db, payload.email, payload.password)

@router.post("/set-password")
async def register_password(
    payload: FacultySetPassword, 
    db = Depends(get_database), 
    current_faculty = Depends(get_current_faculty)
):
    # Allows authenticated faculty to set their password for future logins
    return await auth_service.set_faculty_password(db, current_faculty["id"], payload.password)
