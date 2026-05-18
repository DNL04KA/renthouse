import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from src.core.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'tenant';"))
        except Exception as e:
            print("Error adding tenant:", e)
        try:
            await conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'landlord';"))
        except Exception as e:
            print("Error adding landlord:", e)
    await engine.dispose()
    print("Enum updated!")

if __name__ == "__main__":
    asyncio.run(main())
