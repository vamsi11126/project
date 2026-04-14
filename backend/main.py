from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongodb import close_mongo_connection, connect_to_mongo
from app.routes import admin, admin_auth, appointments, auth, faculty, filters, otp, papers

app = FastAPI(title="Campus Toolkit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_origin_regex=settings.FRONTEND_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()


@app.get("/")
async def root():
    return {"message": "Campus Toolkit API Modular Version"}


api_router = APIRouter(prefix="/api")
api_router.include_router(papers.router)
api_router.include_router(faculty.router)
api_router.include_router(appointments.router)
api_router.include_router(otp.router)
api_router.include_router(filters.router)
api_router.include_router(auth.router)
api_router.include_router(admin_auth.router)
api_router.include_router(admin.router)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
