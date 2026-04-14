from fastapi import APIRouter, Header, HTTPException, Depends
from typing import List
from pymongo import ReturnDocument
from app.db.mongodb import get_database
from app.models.schemas import Paper, PaperUpdate
from app.utils.drive import normalize_and_validate_drive_url
from app.core.config import settings

router = APIRouter(prefix="/papers", tags=["Papers"])

async def check_admin(passcode: str):
    if passcode != settings.ADMIN_PASSCODE:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.get("", response_model=List[Paper])
async def get_papers(db = Depends(get_database)):
    return await db.papers.find({}, {"_id": 0}).to_list(1000)

@router.post("", response_model=Paper)
async def add_paper(paper: Paper, db = Depends(get_database), x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    paper.pdfUrl = await normalize_and_validate_drive_url(paper.pdfUrl)
    await db.papers.insert_one(paper.model_dump())
    return paper

@router.put("/{paper_id}", response_model=Paper)
async def update_paper(
    paper_id: str,
    paper: PaperUpdate,
    db = Depends(get_database),
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

@router.delete("/{paper_id}")
async def delete_paper(paper_id: str, db = Depends(get_database), x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    result = await db.papers.delete_one({"id": paper_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paper not found")

    return {"message": "Paper deleted successfully"}
