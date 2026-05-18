import asyncio
import random
import uuid
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import AsyncSessionLocal
from src.models.all_models import (
    Property, PropertyType, PropertyStatus,
    Tenant, TenantType,
    LeaseContract, PaymentPeriod, ContractStatus,
    Payment, PaymentStatus
)

async def seed():
    async with AsyncSessionLocal() as session:
        rid = str(uuid.uuid4())[:6]
        
        properties = [
            Property(type=PropertyType.flat, country="Беларусь", city="Минск", street=f"Пр. Независимости {rid}", house="11", unit="45", area=65.5, base_rent=1500.00, status=PropertyStatus.available, description="Светлая 2-комнатная квартира в центре"),
            Property(type=PropertyType.office, country="Беларусь", city="Минск", street=f"Немига {rid}", house="5", unit="301", area=120.0, base_rent=3500.00, status=PropertyStatus.available, description="Большой офис Open Space"),
            Property(type=PropertyType.flat, country="Беларусь", city="Минск", street=f"Дзержинского {rid}", house="90", unit="12", area=45.0, base_rent=1100.00, status=PropertyStatus.available, description="Студия возле метро Малиновка"),
            Property(type=PropertyType.warehouse, country="Беларусь", city="Минск", street=f"Промышленная {rid}", house="21", area=500.0, base_rent=2500.00, status=PropertyStatus.available, description="Складское помещение"),
        ]
        session.add_all(properties)
        await session.commit()

        tenants = [
            Tenant(type=TenantType.individual, name=f"Иван Иванов {rid}", phone=f"+37529{random.randint(1000000, 9999999)}", email=f"ivanov{rid}@example.com", notes="Очень ответственный"),
            Tenant(type=TenantType.company, name=f"ООО 'БелТех' {rid}", phone=f"+37517{random.randint(1000000, 9999999)}", tax_id=f"192{random.randint(100000, 999999)}", email=f"info{rid}@beltech.by", notes="Надежная компания"),
        ]
        session.add_all(tenants)
        await session.commit()

        c1_start = date.today() - relativedelta(months=2)
        c1_end = date.today() + relativedelta(months=10)
        c1 = LeaseContract(
            number=f"CN-001-{rid}", property_id=properties[1].id, tenant_id=tenants[1].id,
            start_date=c1_start, end_date=c1_end, rent_amount=3500.00, payment_period=PaymentPeriod.month,
            deposit_amount=3500.0, status=ContractStatus.active
        )
        properties[1].status = PropertyStatus.rented

        c2_start = date.today() - relativedelta(months=5)
        c2_end = date.today() + relativedelta(months=1)
        c2 = LeaseContract(
            number=f"CN-002-{rid}", property_id=properties[0].id, tenant_id=tenants[0].id,
            start_date=c2_start, end_date=c2_end, rent_amount=1500.00, payment_period=PaymentPeriod.month,
            deposit_amount=1500.0, status=ContractStatus.active
        )
        properties[0].status = PropertyStatus.rented

        session.add_all([c1, c2])
        await session.flush()
        
        current = c1.start_date
        while current <= c1.end_date:
            is_past = current < date.today()
            status = PaymentStatus.paid if is_past and random.random() > 0.1 else (PaymentStatus.overdue if is_past else PaymentStatus.pending)
            paid_d = current + timedelta(days=2) if status == PaymentStatus.paid else None
            session.add(Payment(contract_id=c1.id, due_date=current, amount=c1.rent_amount, status=status, paid_date=paid_d))
            current += relativedelta(months=1)

        current = c2.start_date
        while current <= c2.end_date:
            is_past = current < date.today()
            status = PaymentStatus.paid if is_past and random.random() > 0.2 else (PaymentStatus.overdue if is_past else PaymentStatus.pending)
            paid_d = current + timedelta(days=1) if status == PaymentStatus.paid else None
            session.add(Payment(contract_id=c2.id, due_date=current, amount=c2.rent_amount, status=status, paid_date=paid_d))
            current += relativedelta(months=1)

        await session.commit()
        print("Database seeded with cool test data successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
