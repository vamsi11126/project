import uuid
from fastapi import HTTPException
from app.core.security import create_access_token, verify_password, get_password_hash
from app.services.otp_service import create_otp_session, verify_otp_session
from app.utils.validation import is_college_email

async def request_faculty_login(db, email: str):
    email = email.strip().lower()
    if not is_college_email(email):
        raise HTTPException(status_code=400, detail="Only college email addresses are allowed.")

    faculty = await db.faculty_profiles.find_one({"email": email})
    
    # If faculty exists AND has a password, we suggest password login
    if faculty and faculty.get("hashed_password"):
        return {"status": "needs_password", "email": email}

    # If new faculty OR no password set, use OTP
    otp_response = await create_otp_session(db, destination=email, purpose="faculty_login")
    return {"status": "needs_otp", **otp_response}

async def login_with_password(db, email: str, password: str):
    email = email.strip().lower()
    faculty = await db.faculty_profiles.find_one({"email": email})
    
    if not faculty or not faculty.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    if not verify_password(password, faculty["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    token = create_access_token(data={"sub": faculty["id"]})
    return {"access_token": token, "token_type": "bearer", "faculty_id": faculty["id"]}

async def verify_faculty_login(db, otp_id: str, otp_code: str):
    # Verify OTP
    await verify_otp_session(db, otp_id=otp_id, otp_code=otp_code, purpose="faculty_login")
    
    # Get session info to find destination email
    session = await db.otp_sessions.find_one({"id": otp_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session expired or invalid.")
    
    email = session.get("destination")
    
    # Check if faculty exists, if not, CREATE Skeleton profile
    faculty = await db.faculty_profiles.find_one({"email": email})
    if not faculty:
        faculty_id = f"fac_{str(uuid.uuid4())[:8]}"
        new_faculty = {
            "id": faculty_id,
            "email": email,
            "name": "",
            "image": "",
            "cabin_number": "",
            "department": "",
            "available_time_slots": [],
            "is_complete": False,
            "hashed_password": None
        }
        await db.faculty_profiles.insert_one(new_faculty)
        faculty = new_faculty
         
    # Create JWT
    token = create_access_token(data={"sub": faculty["id"]})
    
    # Return if password needs to be set
    needs_password = faculty.get("hashed_password") is None
    
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "faculty_id": faculty["id"],
        "needs_password": needs_password
    }

async def set_faculty_password(db, faculty_id: str, password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
        
    hashed = get_password_hash(password)
    result = await db.faculty_profiles.update_one(
        {"id": faculty_id},
        {"$set": {"hashed_password": hashed}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Faculty not found.")
    return {"message": "Password updated successfully."}
