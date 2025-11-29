from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# ------------------------------
# ENV LOAD + CONFIG
# ------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
ADMIN_PASSCODE = os.getenv("ADMIN_PASSCODE")

mongo_url = os.getenv("MONGO_URL")
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


class Material(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    type: str  # pdf, drive, link
    url: str
    description: str


class RequestSubmission(BaseModel):
    name: str
    email: str
    department: str
    details: str


class RequestRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    department: str
    details: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Subject(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    department: str


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
async def get_papers(
    year: Optional[int] = None,
    department: Optional[str] = None,
    subject: Optional[str] = None,
):
    query = {}
    if year:
        query["year"] = year
    if department:
        query["department"] = department
    if subject:
        query["subject"] = subject

    return await db.papers.find(query, {"_id": 0}).to_list(1000)


@api_router.post("/papers", response_model=Paper)
async def add_paper(paper: Paper, x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    await db.papers.insert_one(paper.model_dump())
    return paper


@api_router.delete("/papers/{paper_id}")
async def delete_paper(paper_id: str, x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    result = await db.papers.delete_one({"id": paper_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paper not found")

    return {"message": "Paper deleted successfully"}


# ------------------------------
# MATERIALS CRUD
# ------------------------------
@api_router.get("/materials", response_model=List[Material])
async def get_materials(subject: Optional[str] = None):
    query = {"subject": subject} if subject else {}
    return await db.materials.find(query, {"_id": 0}).to_list(1000)


@api_router.post("/materials", response_model=Material)
async def add_material(material: Material, x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    await db.materials.insert_one(material.model_dump())
    return material


@api_router.delete("/materials/{material_id}")
async def delete_material(material_id: str, x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    result = await db.materials.delete_one({"id": material_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")

    return {"message": "Material deleted successfully"}


# ------------------------------
# REQUESTS CRUD
# ------------------------------
@api_router.post("/requests", response_model=RequestRecord)
async def submit_request(request: RequestSubmission):
    request_obj = RequestRecord(**request.model_dump())
    doc = request_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()

    await db.requests.insert_one(doc)
    return request_obj


@api_router.get("/requests", response_model=List[RequestRecord])
async def get_requests():
    return await db.requests.find({}, {"_id": 0}).to_list(1000)


@api_router.delete("/requests/{request_id}")
async def delete_request(request_id: str, x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)
    result = await db.requests.delete_one({"id": request_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")

    return {"message": "Request deleted successfully"}


# ------------------------------
# SUBJECTS CRUD
# ------------------------------
@api_router.post("/subjects", response_model=Subject)
async def add_subject(subject: Subject):
    await db.subjects.insert_one(subject.model_dump())
    return subject


@api_router.get("/subjects", response_model=List[Subject])
async def get_subjects():
    return await db.subjects.find({}, {"_id": 0}).to_list(1000)


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


@api_router.get("/material-subjects")
async def get_material_subjects():
    materials = await db.materials.find({}, {"_id": 0}).to_list(1000)
    subjects = sorted(list(set(m["subject"] for m in materials)))
    return {"subjects": subjects}


# ------------------------------
# ADMIN AUTH & STATS
# ------------------------------
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

    papers = await db.papers.count_documents({})
    materials = await db.materials.count_documents({})
    requests = await db.requests.count_documents({})

    return {
        "papers": papers,
        "materials": materials,
        "requests": requests,
    }


# ------------------------------
# DELETE ALL / DROP COLLECTION
# ------------------------------
@api_router.delete("/delete-all")
async def delete_all(x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)

    await db.papers.delete_many({})
    await db.materials.delete_many({})
    await db.requests.delete_many({})
    await db.subjects.delete_many({})

    return {"message": "All collections cleared successfully!"}


@api_router.delete("/drop/{collection}")
async def drop_collection(collection: str, x_admin_passcode: str = Header(None)):
    await check_admin(x_admin_passcode)

    valid = ["papers", "materials", "requests", "subjects"]

    if collection not in valid:
        raise HTTPException(status_code=400, detail="Invalid collection")

    await db.drop_collection(collection)
    return {"message": f"{collection} collection dropped successfully"}


# ------------------------------
# APP CONFIG
# ------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
