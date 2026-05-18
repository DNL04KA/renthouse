import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from src.core.config import settings

async def cleanup():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE properties SET images = '{}' WHERE images IS NULL;"))
        await conn.execute(text("UPDATE properties SET amenities = '{}' WHERE amenities IS NULL;"))
        await conn.execute(text("UPDATE properties SET rooms = 1 WHERE rooms IS NULL;"))
    await engine.dispose()
    print("Database cleanup complete!")

if __name__ == "__main__":
    asyncio.run(cleanup())
