from datetime import date
from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from src.models.all_models import LeaseContract, PaymentPeriod, Payment, PaymentStatus

async def generate_payment_schedule(db: AsyncSession, contract: LeaseContract):
    current = contract.start_date
    delta = relativedelta(months=1) if contract.payment_period == PaymentPeriod.month else relativedelta(months=3)
    while current <= contract.end_date:
        db.add(Payment(contract_id=contract.id, due_date=current, amount=contract.rent_amount, status=PaymentStatus.pending))
        current += delta
    await db.commit()

async def mark_overdue_payments(db: AsyncSession):
    stmt = update(Payment).where(Payment.status == PaymentStatus.pending, Payment.due_date < date.today(), Payment.paid_date == None).values(status=PaymentStatus.overdue)
    await db.execute(stmt)
    await db.commit()
