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
from datetime import datetime, timezone
import re
import httpx

# ------------------------------
# ENV LOAD + CONFIG
# ------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

ADMIN_PASSCODE = os.getenv("ADMIN_PASSCODE")
mongo_url = os.getenv("MONGO_URI")

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


class Material(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    type: str
    url: str
    description: str


class MaterialUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    type: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None

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

# ------------------------------
# MATERIALS CRUD
# ------------------------------
@api_router.get("/materials", response_model=List[Material])
async def get_materials():
    return await db.materials.find({}, {"_id": 0}).to_list(1000)


@api_router.post("/materials", response_model=Material)
async def add_material(material: Material, x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    material.url = await normalize_and_validate_drive_url(material.url)
    await db.materials.insert_one(material.model_dump())
    return material


@api_router.put("/materials/{material_id}", response_model=Material)
async def update_material(
    material_id: str,
    material: MaterialUpdate,
    x_admin_passcode: str = Header(None),
):
    await check_admin(x_admin_passcode)

    update_data = {k: v for k, v in material.model_dump().items() if v is not None}

    if "url" in update_data:
        update_data["url"] = await normalize_and_validate_drive_url(update_data["url"])

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided")

    result = await db.materials.find_one_and_update(
        {"id": material_id},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )

    if not result:
        raise HTTPException(status_code=404, detail="Material not found")

    return result

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
