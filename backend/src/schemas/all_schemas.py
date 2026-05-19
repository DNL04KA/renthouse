from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime, date
import uuid
from src.models.all_models import UserRole, PropertyType, PropertyStatus, ListingType, TenantType, PaymentPeriod, ContractStatus, PaymentStatus, LeaseContractType, ConversationStatus, Currency

class Token(BaseModel):
    access_token: str; token_type: str = "bearer"

class UserCreate(BaseModel):
    username: str; password: str; role: UserRole = UserRole.tenant

class UserRegister(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.tenant
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    patronymic: Optional[str] = None
    birth_date: Optional[date] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    patronymic: Optional[str] = None
    birth_date: Optional[date] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PropertyCreate(BaseModel):
    listing_type: ListingType = ListingType.rent
    type: PropertyType
    country: Optional[str] = None
    city: Optional[str] = None
    street: Optional[str] = None
    house: Optional[str] = None
    unit: Optional[str] = None
    area: float
    base_rent: float
    currency: Currency = Currency.byn
    sale_price: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    rooms: Optional[int] = 1
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    images: Optional[List[str]] = []
    amenities: Optional[List[str]] = []
    owner_id: Optional[uuid.UUID] = None

class PropertyUpdate(BaseModel):
    listing_type: Optional[ListingType] = None
    type: Optional[PropertyType] = None
    country: Optional[str] = None
    city: Optional[str] = None
    street: Optional[str] = None
    house: Optional[str] = None
    unit: Optional[str] = None
    area: Optional[float] = None
    base_rent: Optional[float] = None
    currency: Optional[Currency] = None
    sale_price: Optional[float] = None
    status: Optional[PropertyStatus] = None
    description: Optional[str] = None
    rooms: Optional[int] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    images: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    owner_id: Optional[uuid.UUID] = None

class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    name: Optional[str] = None
    phone: Optional[str] = None

class UserSelfUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    patronymic: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    model_config = ConfigDict(from_attributes=True)

class ContractStatusUpdate(BaseModel):
    status: ContractStatus

class PropertyOwner(BaseModel):
    id: uuid.UUID; name: Optional[str] = None; phone: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PropertyResponse(PropertyCreate):
    id: uuid.UUID; status: PropertyStatus; owner: Optional[PropertyOwner] = None
    model_config = ConfigDict(from_attributes=True)

class TenantCreate(BaseModel):
    type: TenantType; name: str; phone: str; email: Optional[EmailStr] = None; tax_id: Optional[str] = None; notes: Optional[str] = None
class TenantResponse(TenantCreate):
    id: uuid.UUID; user_id: Optional[uuid.UUID] = None; model_config = ConfigDict(from_attributes=True)

class PaymentCreate(BaseModel):
    contract_id: uuid.UUID; due_date: date; amount: float; currency: Currency = Currency.byn; status: PaymentStatus = PaymentStatus.pending

class PaymentBriefResponse(PaymentCreate):
    """Used inside ContractResponse to avoid circular nesting."""
    id: uuid.UUID
    paid_date: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)

class PaymentContractInfo(BaseModel):
    id: uuid.UUID
    number: str
    property: Optional["PropertyResponse"] = None
    model_config = ConfigDict(from_attributes=True)

class PaymentResponse(PaymentCreate):
    id: uuid.UUID
    paid_date: Optional[date] = None
    contract: Optional[PaymentContractInfo] = None
    model_config = ConfigDict(from_attributes=True)

class ContractCreate(BaseModel):
    property_id: uuid.UUID
    tenant_id: uuid.UUID
    start_date: date
    end_date: date
    rent_amount: float
    currency: Currency = Currency.byn
    payment_period: PaymentPeriod = PaymentPeriod.month
    number: Optional[str] = None
    contract_type: LeaseContractType = LeaseContractType.standard

class ContractFromConvCreate(BaseModel):
    start_date: date
    end_date: date
    rent_amount: float
    currency: Currency = Currency.byn
    payment_period: PaymentPeriod = PaymentPeriod.month
    number: Optional[str] = None
    contract_type: LeaseContractType = LeaseContractType.standard

class ContractPassportUpdate(BaseModel):
    signing_city: Optional[str] = None
    signing_date: Optional[date] = None
    landlord_passport: Optional[str] = None
    landlord_address: Optional[str] = None
    tenant_passport: Optional[str] = None
    tenant_address: Optional[str] = None

class ContractResponse(BaseModel):
    id: uuid.UUID
    number: str
    property_id: uuid.UUID
    tenant_id: uuid.UUID
    property: Optional[PropertyResponse] = None
    tenant: Optional[TenantResponse] = None
    start_date: date
    end_date: date
    rent_amount: float
    currency: Currency
    payment_period: PaymentPeriod
    status: ContractStatus
    contract_type: LeaseContractType
    signing_city: Optional[str] = None
    signing_date: Optional[date] = None
    landlord_passport: Optional[str] = None
    landlord_address: Optional[str] = None
    tenant_passport: Optional[str] = None
    tenant_address: Optional[str] = None
    payments: List[PaymentBriefResponse] = []
    model_config = ConfigDict(from_attributes=True)

# ── Conversations & Messages ──────────────────────────────────────────────────

class UserBrief(BaseModel):
    id: uuid.UUID
    username: str
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    patronymic: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    model_config = ConfigDict(from_attributes=True)

class PropertyBrief(BaseModel):
    id: uuid.UUID
    city: Optional[str] = None
    street: Optional[str] = None
    house: Optional[str] = None
    type: PropertyType
    area: float
    base_rent: float
    currency: Currency
    status: PropertyStatus
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    images: Optional[List[str]] = []
    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    text: str

class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sender: Optional[UserBrief] = None
    text: str
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ConversationCreate(BaseModel):
    property_id: uuid.UUID
    initial_message: str

class ConversationResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    property: Optional[PropertyBrief] = None
    tenant_user_id: uuid.UUID
    tenant: Optional[UserBrief] = None
    landlord_user_id: uuid.UUID
    landlord: Optional[UserBrief] = None
    status: ConversationStatus
    messages: List[MessageResponse] = []
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
