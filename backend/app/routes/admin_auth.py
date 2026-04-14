from fastapi import APIRouter, Depends, Request, Response

from app.core.security import (
    clear_admin_session_cookie,
    get_current_admin,
    set_admin_session_cookie,
)
from app.db.mongodb import get_database
from app.models.schemas import AdminLoginRequest, AdminLoginResponse, AdminPublic
from app.services import admin_auth_service

router = APIRouter(prefix="/auth/admin", tags=["Admin Authentication"])


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    response: Response,
    db=Depends(get_database),
):
    result = await admin_auth_service.login_admin(db, request, payload.email, payload.password)
    set_admin_session_cookie(response, result["token"])
    return {"admin": result["admin"]}


@router.get("/me", response_model=AdminPublic)
async def admin_me(current_admin=Depends(get_current_admin)):
    return current_admin


@router.post("/logout")
async def admin_logout(response: Response):
    clear_admin_session_cookie(response)
    return {"message": "Logged out successfully"}
