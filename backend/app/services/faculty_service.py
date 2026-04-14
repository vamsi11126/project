from fastapi import HTTPException
from app.models.schemas import Faculty, FacultyProfileUpdate, FacultyPublicProfile
from pymongo import ReturnDocument

# --- SERVICE LOGIC ---

async def create_or_update_profile(db, faculty_id: str, profile_data: FacultyProfileUpdate):
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    # Check current profile state
    faculty = await db.faculty_profiles.find_one({"id": faculty_id})
    if not faculty:
        # Should not happen if authenticated, but safety check
        raise HTTPException(status_code=404, detail="Faculty account not found")
        
    final_data = {**faculty, **update_data}
    
    # Check completeness (mandatory for public view)
    is_complete = all([
        final_data.get("name"),
        final_data.get("cabin_number"),
        final_data.get("department")
    ])
    
    update_data["is_complete"] = is_complete
    
    result = await db.faculty_profiles.find_one_and_update(
        {"id": faculty_id},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )
    return result

async def get_all_faculty(db):
    # Only return complete profiles
    # SECURITY: Exclude email from public list
    profiles = await db.faculty_profiles.find(
        {"is_complete": True}, 
        {"_id": 0, "email": 0} 
    ).to_list(1000)
    
    return profiles

async def get_faculty_by_id(db, faculty_id: str):
    # SECURITY: Exclude email from public detail view
    faculty = await db.faculty_profiles.find_one(
        {"id": faculty_id}, 
        {"_id": 0, "email": 0}
    )
    
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
        
    # Double check completeness for public view
    if not faculty.get("is_complete"):
        raise HTTPException(status_code=403, detail="Faculty profile is not public yet")
        
    return faculty
