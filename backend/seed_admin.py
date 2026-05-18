import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import AsyncSessionLocal
from src.core.security import get_password_hash
from src.models.all_models import User, UserRole

async def seed():
    async with AsyncSessionLocal() as session:
        user = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            role=UserRole.admin
        )
        session.add(user)
        await session.commit()
        print("Admin user created successfully: admin / admin123")

if __name__ == "__main__":
    asyncio.run(seed())
