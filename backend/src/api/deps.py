from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
from src.core.config import settings
from src.core.database import get_session
from src.models.all_models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_session)) -> User:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if not username: raise HTTPException(401, "Invalid token")
    except Exception: raise HTTPException(401, "Invalid token")
    
    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not user or not user.is_active: raise HTTPException(401, "User inactive or not found")
    return user

def require_role(roles: list[UserRole]):
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role not in roles: raise HTTPException(403, "Not enough permissions")
        return user
    return role_checker
