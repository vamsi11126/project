from fastapi import APIRouter, Depends
from app.db.mongodb import get_database

router = APIRouter(prefix="/filters", tags=["Filters"])

@router.get("")
async def get_filters(db = Depends(get_database)):
    papers = await db.papers.find({}, {"_id": 0}).to_list(1000)

    years = sorted(list(set(p["year"] for p in papers)), reverse=True)
    departments = sorted(list(set(p["department"] for p in papers)))
    subjects = sorted(list(set(p["subject"] for p in papers)))

    return {
        "years": years,
        "departments": departments,
        "subjects": subjects,
    }
