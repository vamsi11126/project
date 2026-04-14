from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.routes import papers, faculty, appointments, otp, filters, auth

app = FastAPI(title="Campus Toolkit API")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lifecycle events
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Campus Toolkit API Modular Version"}

# Include Routers
api_router = APIRouter(prefix="/api")
api_router.include_router(papers.router)
api_router.include_router(faculty.router)
api_router.include_router(appointments.router)
api_router.include_router(otp.router)
api_router.include_router(filters.router)
api_router.include_router(auth.router)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
