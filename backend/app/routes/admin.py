from fastapi import APIRouter, Depends

from app.core.security import get_current_admin
from app.db.mongodb import get_database
from app.models.schemas import AdminStats
from app.services.admin_service import build_admin_stats

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStats)
async def admin_stats(db=Depends(get_database), current_admin=Depends(get_current_admin)):
    return await build_admin_stats(db)
