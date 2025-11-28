from fastapi import FastAPI, APIRouter, HTTPException
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
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
    type: str  # "pdf", "drive", "link"
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



# Routes
@api_router.get("/")
async def root():
    return {"message": "Student Toolkit API"}

@api_router.get("/papers", response_model=List[Paper])
async def get_papers(year: Optional[int] = None, department: Optional[str] = None, subject: Optional[str] = None):
    query = {}
    if year:
        query["year"] = year
    if department:
        query["department"] = department
    if subject:
        query["subject"] = subject
    
    papers = await db.papers.find(query, {"_id": 0}).to_list(1000)
    return papers

@api_router.get("/materials", response_model=List[Material])
async def get_materials(subject: Optional[str] = None):
    query = {}
    if subject:
        query["subject"] = subject
    
    materials = await db.materials.find(query, {"_id": 0}).to_list(1000)
    return materials

@api_router.post("/requests", response_model=RequestRecord)
async def submit_request(request: RequestSubmission):
    request_dict = request.model_dump()
    request_obj = RequestRecord(**request_dict)
    
    doc = request_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.requests.insert_one(doc)
    return request_obj
"""
@api_router.post("/seed")
async def seed_data():
    # Clear existing data
    await db.papers.delete_many({})
    await db.materials.delete_many({})
    
    # Seed papers
    papers_data = [
        {"id": str(uuid.uuid4()), "title": "Data Structures Mid-Term", "subject": "Data Structures", "department": "Computer Science", "year": 2024, "pdfUrl": "https://example.com/ds-mid-2024.pdf"},
        {"id": str(uuid.uuid4()), "title": "Algorithms Final Exam", "subject": "Algorithms", "department": "Computer Science", "year": 2024, "pdfUrl": "https://example.com/algo-final-2024.pdf"},
        {"id": str(uuid.uuid4()), "title": "Database Systems Mid-Term", "subject": "Database Systems", "department": "Computer Science", "year": 2023, "pdfUrl": "https://example.com/db-mid-2023.pdf"},
        {"id": str(uuid.uuid4()), "title": "Operating Systems Final", "subject": "Operating Systems", "department": "Computer Science", "year": 2023, "pdfUrl": "https://example.com/os-final-2023.pdf"},
        {"id": str(uuid.uuid4()), "title": "Computer Networks Mid-Term", "subject": "Computer Networks", "department": "Computer Science", "year": 2024, "pdfUrl": "https://example.com/cn-mid-2024.pdf"},
        {"id": str(uuid.uuid4()), "title": "Circuit Analysis Mid-Term", "subject": "Circuit Analysis", "department": "Electrical Engineering", "year": 2024, "pdfUrl": "https://example.com/circuit-mid-2024.pdf"},
        {"id": str(uuid.uuid4()), "title": "Digital Electronics Final", "subject": "Digital Electronics", "department": "Electrical Engineering", "year": 2023, "pdfUrl": "https://example.com/digital-final-2023.pdf"},
        {"id": str(uuid.uuid4()), "title": "Thermodynamics Mid-Term", "subject": "Thermodynamics", "department": "Mechanical Engineering", "year": 2024, "pdfUrl": "https://example.com/thermo-mid-2024.pdf"},
        {"id": str(uuid.uuid4()), "title": "Fluid Mechanics Final", "subject": "Fluid Mechanics", "department": "Mechanical Engineering", "year": 2023, "pdfUrl": "https://example.com/fluid-final-2023.pdf"},
        {"id": str(uuid.uuid4()), "title": "Calculus I Mid-Term", "subject": "Calculus", "department": "Mathematics", "year": 2024, "pdfUrl": "https://example.com/calc1-mid-2024.pdf"},
    ]
    await db.papers.insert_many(papers_data)
    
    # Seed materials
    materials_data = [
        {"id": str(uuid.uuid4()), "title": "Data Structures Complete Notes", "subject": "Data Structures", "type": "pdf", "url": "https://example.com/ds-notes.pdf", "description": "Comprehensive notes covering arrays, linked lists, trees, and graphs"},
        {"id": str(uuid.uuid4()), "title": "Algorithms Video Lectures", "subject": "Algorithms", "type": "drive", "url": "https://drive.google.com/folder/algo-lectures", "description": "Full semester video lectures and slides"},
        {"id": str(uuid.uuid4()), "title": "Database Design Tutorial", "subject": "Database Systems", "type": "link", "url": "https://example.com/db-tutorial", "description": "Interactive tutorial on ER diagrams and normalization"},
        {"id": str(uuid.uuid4()), "title": "OS Concept Maps", "subject": "Operating Systems", "type": "pdf", "url": "https://example.com/os-maps.pdf", "description": "Visual concept maps for processes, memory, and file systems"},
        {"id": str(uuid.uuid4()), "title": "Networking Lab Manual", "subject": "Computer Networks", "type": "pdf", "url": "https://example.com/network-lab.pdf", "description": "Complete lab experiments with solutions"},
        {"id": str(uuid.uuid4()), "title": "Circuit Theory Notes", "subject": "Circuit Analysis", "type": "drive", "url": "https://drive.google.com/folder/circuit-notes", "description": "Handwritten notes from Prof. Kumar"},
        {"id": str(uuid.uuid4()), "title": "Digital Logic Design", "subject": "Digital Electronics", "type": "pdf", "url": "https://example.com/digital-design.pdf", "description": "Complete reference book with examples"},
        {"id": str(uuid.uuid4()), "title": "Thermodynamics Problem Sets", "subject": "Thermodynamics", "type": "drive", "url": "https://drive.google.com/folder/thermo-problems", "description": "300+ solved problems with detailed solutions"},
    ]
    await db.materials.insert_many(materials_data)
    
    return {"message": "Database seeded successfully", "papers": len(papers_data), "materials": len(materials_data)}
"""
@api_router.get("/filters")
async def get_filters():
    # Get unique values for filters
    papers = await db.papers.find({}, {"_id": 0}).to_list(1000)
    
    years = sorted(list(set(p["year"] for p in papers)), reverse=True)
    departments = sorted(list(set(p["department"] for p in papers)))
    subjects = sorted(list(set(p["subject"] for p in papers)))
    
    return {
        "years": years,
        "departments": departments,
        "subjects": subjects
    }

@api_router.get("/material-subjects")
async def get_material_subjects():
    materials = await db.materials.find({}, {"_id": 0}).to_list(1000)
    subjects = sorted(list(set(m["subject"] for m in materials)))
    return {"subjects": subjects}

@api_router.post('/papers', response_model=Paper)
async def add_paper(paper: Paper):
    paper_dict = paper.model_dump()
    await db.papers.insert_one(paper_dict)
    return paper
@api_router.post('/materials', response_model=Material)
async def add_material(material: Material):
    material_dict = material.model_dump()
    await db.materials.insert_one(material_dict)
    return material
@api_router.delete("/delete-all")
async def delete_all_data():
    await db.papers.delete_many({})
    await db.materials.delete_many({})
    await db.requests.delete_many({})
    return {"message": "All collections cleared successfully!"}
@api_router.post("/subjects", response_model=Subject)
async def add_subject(subject: Subject):
    await db.subjects.insert_one(subject.model_dump())
    return subject


@api_router.get("/subjects", response_model=List[Subject])
async def get_subjects():
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(1000)
    return subjects


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asc)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()