import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.models.all_models import User, UserRole, Tenant, TenantType
from src.core.config import settings
from src.core.security import get_password_hash

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Admin user
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            role=UserRole.admin,
            name="Администратор Иван",
            first_name="Иван",
            last_name="Петров",
            phone="+375 29 999-99-99"
        )
        session.add(admin)
        await session.flush()
        print("✓ Admin created: admin / admin123")

        # 2. Landlord 1
        landlord = User(
            username="landlord",
            password_hash=get_password_hash("landlord123"),
            role=UserRole.landlord,
            name="Арендодатель Алексей",
            first_name="Алексей",
            last_name="Иванов",
            phone="+375 29 111-22-33"
        )
        session.add(landlord)
        await session.flush()
        print("✓ Landlord created: landlord / landlord123")

        # 3. Tenant user
        tenant_user = User(
            username="tenant",
            password_hash=get_password_hash("tenant123"),
            role=UserRole.tenant,
            name="Арендатор Сергей",
            first_name="Сергей",
            last_name="Смирнов",
            patronymic="Иванович",
            phone="+375 29 333-44-55",
            birth_date="1990-05-15"
        )
        session.add(tenant_user)
        await session.flush()
        
        # Create tenant profile
        tenant = Tenant(
            user_id=tenant_user.id,
            name="Сергей Смирнов",
            phone="+375 29 333-44-55",
            type=TenantType.individual,
            email="tenant@example.com"
        )
        session.add(tenant)
        await session.flush()
        print("✓ Tenant created: tenant / tenant123")

        await session.commit()
        print("\n✅ All test users created successfully!")
        print("\nТестовые аккаунты:")
        print("─" * 50)
        print("Администратор:")
        print("  Логин:    admin")
        print("  Пароль:   admin123")
        print("\nАрендодатель:")
        print("  Логин:    landlord")
        print("  Пароль:   landlord123")
        print("\nАрендатор:")
        print("  Логин:    tenant")
        print("  Пароль:   tenant123")
        print("─" * 50)

if __name__ == "__main__":
    asyncio.run(seed())
