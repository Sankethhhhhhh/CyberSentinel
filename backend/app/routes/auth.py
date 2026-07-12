from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from app.services.auth_service import register_user, login_user, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(request: RegisterRequest):
    return register_user(request.name, request.email, request.password)


@router.post("/login")
async def login(request: LoginRequest):
    return login_user(request.email, request.password)


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user
