import uuid, enum
from datetime import datetime, timezone, date
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import String, Boolean, Enum, Numeric, Text, ForeignKey, Date, Integer, Float

class Base(DeclarativeBase): pass

class AuditableBase(Base):
    __abstract__ = True
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

class UserRole(str, enum.Enum):
    admin = "admin"; landlord = "landlord"; tenant = "tenant"

class User(AuditableBase):
    __tablename__ = "users"
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.tenant)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    name: Mapped[str] = mapped_column(String, nullable=True)
    first_name: Mapped[str] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, nullable=True)
    patronymic: Mapped[str] = mapped_column(String, nullable=True)
    birth_date: Mapped[date] = mapped_column(Date, nullable=True)
    phone: Mapped[str] = mapped_column(String, nullable=True)
    address: Mapped[str] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, nullable=True)

class PropertyType(str, enum.Enum):
    flat = "flat"; office = "office"; warehouse = "warehouse"; other = "other"

class PropertyStatus(str, enum.Enum):
    available = "available"; rented = "rented"; reserved = "reserved"; inactive = "inactive"; sold = "sold"

class ListingType(str, enum.Enum):
    rent = "rent"
    sale = "sale"

class Currency(str, enum.Enum):
    byn = "BYN"      # Белорусский рубль
    eur = "EUR"      # Евро
    rub = "RUB"      # Российский рубль
    usd = "USD"      # Доллар США

class Property(AuditableBase):
    __tablename__ = "properties"
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    listing_type: Mapped[ListingType] = mapped_column(Enum(ListingType), default=ListingType.rent)
    type: Mapped[PropertyType] = mapped_column(Enum(PropertyType))
    country: Mapped[str] = mapped_column(String, nullable=True)
    city: Mapped[str] = mapped_column(String, nullable=True)
    street: Mapped[str] = mapped_column(String, nullable=True)
    house: Mapped[str] = mapped_column(String, nullable=True)
    unit: Mapped[str] = mapped_column(String, nullable=True)
    area: Mapped[float] = mapped_column(Numeric(10, 2))
    base_rent: Mapped[float] = mapped_column(Numeric(12, 2))
    currency: Mapped[Currency] = mapped_column(Enum(Currency), default=Currency.byn)
    status: Mapped[PropertyStatus] = mapped_column(Enum(PropertyStatus), default=PropertyStatus.available)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    rooms: Mapped[int] = mapped_column(Integer, nullable=True, default=1)
    floor: Mapped[int] = mapped_column(Integer, nullable=True)
    total_floors: Mapped[int] = mapped_column(Integer, nullable=True)
    sale_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    images: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    amenities: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    owner = relationship("User", foreign_keys=[owner_id])
    contracts = relationship("LeaseContract", back_populates="property")

class TenantType(str, enum.Enum):
    individual = "individual"; company = "company"

class Tenant(AuditableBase):
    __tablename__ = "tenants"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type: Mapped[TenantType] = mapped_column(Enum(TenantType))
    name: Mapped[str] = mapped_column(String, index=True)
    phone: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=True)
    tax_id: Mapped[str] = mapped_column(String, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    contracts = relationship("LeaseContract", back_populates="tenant")

class PaymentPeriod(str, enum.Enum):
    month = "month"; quarter = "quarter"

class ContractStatus(str, enum.Enum):
    active = "active"; terminated = "terminated"; finished = "finished"; planned = "planned"

class LeaseContractType(str, enum.Enum):
    standard = "standard"
    short_term = "short_term"
    commercial = "commercial"

def generate_contract_number():
    return f"CNT-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"

class LeaseContract(AuditableBase):
    __tablename__ = "lease_contracts"
    number: Mapped[str] = mapped_column(String, unique=True, index=True, default=generate_contract_number)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="RESTRICT"))
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="RESTRICT"))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    rent_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    currency: Mapped[Currency] = mapped_column(Enum(Currency), default=Currency.byn)
    payment_period: Mapped[PaymentPeriod] = mapped_column(Enum(PaymentPeriod), default=PaymentPeriod.month)
    deposit_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus), default=ContractStatus.active)
    contract_type: Mapped[LeaseContractType] = mapped_column(Enum(LeaseContractType), default=LeaseContractType.standard)
    signing_city: Mapped[str] = mapped_column(String, nullable=True, default="Минск")
    signing_date: Mapped[date] = mapped_column(Date, nullable=True)
    landlord_passport: Mapped[str] = mapped_column(String, nullable=True)
    landlord_address: Mapped[str] = mapped_column(String, nullable=True)
    tenant_passport: Mapped[str] = mapped_column(String, nullable=True)
    tenant_address: Mapped[str] = mapped_column(String, nullable=True)
    property = relationship("Property", back_populates="contracts")
    tenant = relationship("Tenant", back_populates="contracts")
    payments = relationship("Payment", back_populates="contract", cascade="all, delete-orphan")

class PaymentStatus(str, enum.Enum):
    pending = "pending"; paid = "paid"; overdue = "overdue"; partially_paid = "partially_paid"

class Payment(AuditableBase):
    __tablename__ = "payments"
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lease_contracts.id", ondelete="CASCADE"))
    due_date: Mapped[date] = mapped_column(Date)
    paid_date: Mapped[date] = mapped_column(Date, nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    currency: Mapped[Currency] = mapped_column(Enum(Currency), default=Currency.byn)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.pending)
    contract = relationship("LeaseContract", back_populates="payments")

# ── Conversations & Messages ──────────────────────────────────────────────────

class ConversationStatus(str, enum.Enum):
    active = "active"
    contracted = "contracted"
    closed = "closed"

class Conversation(AuditableBase):
    __tablename__ = "conversations"
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"))
    tenant_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    landlord_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[ConversationStatus] = mapped_column(Enum(ConversationStatus), default=ConversationStatus.active)
    property = relationship("Property")
    tenant = relationship("User", foreign_keys=[tenant_user_id])
    landlord = relationship("User", foreign_keys=[landlord_user_id])
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

class Message(AuditableBase):
    __tablename__ = "messages"
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"))
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
