import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.models.all_models import Property, PropertyType, PropertyStatus, User, UserRole, Currency
from src.core.config import settings
from src.core.security import get_password_hash

# Image URLs from Unsplash (free to use)
IMG_URLS = {
    'apartment1': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'apartment2': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'office': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'house': 'https://images.unsplash.com/photo-1629399494900-b2eede3b1a1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'
}

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Create a Landlord if not exists
        landlord = User(
            username="landlord1",
            password_hash=get_password_hash("password"),
            role=UserRole.landlord,
            name="Алексей Иванов",
            phone="+375 29 111-22-33"
        )
        session.add(landlord)
        await session.flush()

        # 2. Add high-quality properties
        properties = [
            Property(
                owner_id=landlord.id,
                type=PropertyType.flat,
                city="Минск",
                street="пр. Независимости",
                house="12",
                area=75.5,
                base_rent=1200.0,
                currency=Currency.byn,
                latitude=53.9045,
                longitude=27.5615,
                status=PropertyStatus.available,
                description="Роскошная квартира в самом центре города. Панорамные окна, современный ремонт, полностью меблирована. Идеально для тех, кто ценит комфорт и стиль.",
                rooms=3,
                floor=5,
                total_floors=12,
                images=["https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80", "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"],
                amenities=["Wi-Fi", "Кондиционер", "Посудомоечная машина", "Парковка"]
            ),
            Property(
                owner_id=landlord.id,
                type=PropertyType.flat,
                city="Минск",
                street="ул. Октябрьская",
                house="19",
                area=55.0,
                base_rent=850.0,
                currency=Currency.byn,
                latitude=53.8905,
                longitude=27.5475,
                status=PropertyStatus.available,
                description="Стильный лофт в креативном квартале. Высокие потолки, кирпичные стены. Рядом лучшие кафе и галереи города.",
                rooms=2,
                floor=2,
                total_floors=4,
                images=["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"],
                amenities=["Wi-Fi", "Стиральная машина", "Близко к метро"]
            ),
            Property(
                owner_id=landlord.id,
                type=PropertyType.office,
                city="Минск",
                street="ул. Клары Цеткин",
                house="51",
                area=120.0,
                base_rent=2500.0,
                currency=Currency.byn,
                latitude=53.9125,
                longitude=27.5545,
                status=PropertyStatus.available,
                description="Современное офисное пространство в бизнес-центре класса А. Open space, переговорные комнаты, зона отдыха.",
                rooms=4,
                floor=10,
                total_floors=20,
                images=["https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"],
                amenities=["Круглосуточный доступ", "Охрана", "Скоростной интернет"]
            ),
            Property(
                owner_id=landlord.id,
                type=PropertyType.other,
                city="Минск (пригород)",
                street="Радужная",
                house="5",
                area=250.0,
                base_rent=4000.0,
                currency=Currency.byn,
                latitude=53.8765,
                longitude=27.4815,
                status=PropertyStatus.available,
                description="Превосходный коттедж для большой семьи. Собственный бассейн, зона барбекю, тихий район.",
                rooms=6,
                floor=1,
                total_floors=2,
                images=["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"],
                amenities=["Бассейн", "Гараж", "Терраса", "Сауна"]
            )
        ]
        session.add_all(properties)
        await session.commit()
    print("Marketplace data seeded!")

if __name__ == "__main__":
    asyncio.run(seed())
