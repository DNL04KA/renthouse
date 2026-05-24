from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, timedelta
import uuid

from src.core.database import get_session
from src.core.security import verify_password, get_password_hash, create_access_token
from src.core.config import settings
from src.models.all_models import User, UserRole, Property, PropertyStatus, ListingType, Tenant, TenantType, LeaseContract, ContractStatus, Payment, PaymentStatus, Conversation, ConversationStatus, Message
from src.schemas.all_schemas import Token, UserCreate, UserRegister, UserResponse, UserUpdate, UserSelfUpdate, PasswordChange, PropertyCreate, PropertyUpdate, PropertyResponse, TenantCreate, TenantResponse, ContractCreate, ContractFromConvCreate, ContractPassportUpdate, ContractStatusUpdate, ContractResponse, PaymentResponse, PaymentBriefResponse, ConversationCreate, ConversationResponse, MessageCreate, MessageResponse
from src.api.deps import get_current_user, require_role
from src.services.payment_service import generate_payment_schedule, mark_overdue_payments
from src.services.currency_service import get_currency_service, CurrencyService

auth_router = APIRouter(prefix="/auth", tags=["auth"])
admin_only = Depends(require_role([UserRole.admin]))
landlord_access = Depends(require_role([UserRole.admin, UserRole.landlord]))
tenant_access = Depends(require_role([UserRole.admin, UserRole.landlord, UserRole.tenant]))

@auth_router.post("/register", response_model=UserResponse)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_session)):
    if (await db.execute(select(User).where(User.username == user_in.username))).scalar_one_or_none():
        raise HTTPException(400, "User exists")
    full_name = " ".join(filter(None, [user_in.last_name, user_in.first_name, user_in.patronymic])) or user_in.name
    user = User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        name=full_name,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        patronymic=user_in.patronymic,
        birth_date=user_in.birth_date,
        phone=user_in.phone,
        address=user_in.address,
    )
    db.add(user); await db.commit(); await db.refresh(user)
    if user.role == UserRole.tenant:
        tenant = Tenant(user_id=user.id, name=full_name or user.username, phone=user_in.phone or user.username, type=TenantType.individual)
        db.add(tenant); await db.commit()
    return user

@auth_router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_session)):
    user = (await db.execute(select(User).where(User.username == form_data.username))).scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.password_hash): raise HTTPException(401, "Incorrect password")
    token = create_access_token({"sub": user.username, "role": user.role.value}, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": token, "token_type": "bearer"}

@auth_router.get("/me", response_model=UserResponse)
async def get_me(curr_user: User = Depends(get_current_user)):
    return curr_user

@auth_router.patch("/me", response_model=UserResponse)
async def update_me(body: UserSelfUpdate, db: AsyncSession = Depends(get_session), curr_user: User = Depends(get_current_user)):
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(curr_user, k, v)
    # Recompute full name
    curr_user.name = " ".join(filter(None, [curr_user.last_name, curr_user.first_name, curr_user.patronymic]))
    await db.commit()
    await db.refresh(curr_user)
    return curr_user

@auth_router.patch("/me/password")
async def change_password(body: PasswordChange, db: AsyncSession = Depends(get_session), curr_user: User = Depends(get_current_user)):
    if not verify_password(body.current_password, curr_user.password_hash):
        raise HTTPException(400, "Неверный текущий пароль")
    curr_user.password_hash = get_password_hash(body.new_password)
    await db.commit()
    return {"ok": True}

prop_router = APIRouter(prefix="/properties", tags=["properties"])
@prop_router.get("", response_model=List[PropertyResponse])
async def read_props(
    city: str = Query(None),
    min_price: float = Query(None),
    max_price: float = Query(None),
    rooms: int = Query(None),
    type: str = Query(None),
    db: AsyncSession = Depends(get_session),
    curr_user: User = Depends(get_current_user)
):
    stmt = select(Property).options(selectinload(Property.owner))
    if city: stmt = stmt.where(Property.city.ilike(f"%{city}%"))
    if min_price is not None: stmt = stmt.where(Property.base_rent >= min_price)
    if max_price is not None: stmt = stmt.where(Property.base_rent <= max_price)
    if rooms is not None: stmt = stmt.where(Property.rooms == rooms)
    if type: stmt = stmt.where(Property.type == type)
    
    # Role-based filtering
    if curr_user.role == UserRole.tenant:
        # Tenants see only available properties
        stmt = stmt.where(Property.status == PropertyStatus.available)
    elif curr_user.role == UserRole.landlord:
        # Landlords see only their own properties
        stmt = stmt.where(Property.owner_id == curr_user.id)
    # Admin sees all
    
    return (await db.execute(stmt)).scalars().all()
@prop_router.post("", response_model=PropertyResponse)
async def create_prop(prop_in: PropertyCreate, db: AsyncSession = Depends(get_session), curr_user: User = landlord_access):
    from src.services.geocoding_service import geocode_address
    data = prop_in.model_dump(exclude={'owner_id'})
    chosen_owner = prop_in.owner_id if (curr_user.role == UserRole.admin and prop_in.owner_id) else curr_user.id
    # Auto-geocode if no coords provided
    if not data.get('latitude') and not data.get('longitude'):
        coords = await geocode_address(data.get('city', ''), data.get('street', ''), data.get('house', ''))
        if coords:
            data['latitude'], data['longitude'] = coords
    prop = Property(**data, owner_id=chosen_owner)
    db.add(prop); await db.commit(); await db.refresh(prop); return prop

@prop_router.patch("/{id}", response_model=PropertyResponse)
async def update_prop(
    id: uuid.UUID,
    prop_in: PropertyUpdate,
    db: AsyncSession = Depends(get_session),
    curr_user: User = landlord_access,
):
    stmt = select(Property).options(selectinload(Property.owner)).where(Property.id == id)
    if curr_user.role == UserRole.landlord:
        stmt = stmt.where(Property.owner_id == curr_user.id)
    prop = (await db.execute(stmt)).scalar_one_or_none()
    if not prop: raise HTTPException(404, "Property not found")
    from src.services.geocoding_service import geocode_address
    update_data = prop_in.model_dump(exclude_unset=True, exclude_none=True)
    if 'owner_id' in update_data and curr_user.role != UserRole.admin:
        del update_data['owner_id']
    for k, v in update_data.items():
        setattr(prop, k, v)
    # Re-geocode if address fields changed and no explicit coords given
    addr_changed = any(k in update_data for k in ('city', 'street', 'house'))
    has_coords = 'latitude' in update_data or 'longitude' in update_data
    if addr_changed and not has_coords and not (prop.latitude and prop.longitude):
        coords = await geocode_address(prop.city or '', prop.street or '', prop.house or '')
        if coords:
            prop.latitude, prop.longitude = coords
    await db.commit()
    await db.refresh(prop)
    stmt2 = select(Property).options(selectinload(Property.owner)).where(Property.id == id)
    return (await db.execute(stmt2)).scalar_one()

@prop_router.delete("/{id}")
async def delete_prop(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    curr_user: User = landlord_access,
):
    stmt = select(Property).where(Property.id == id)
    if curr_user.role == UserRole.landlord:
        stmt = stmt.where(Property.owner_id == curr_user.id)
    prop = (await db.execute(stmt)).scalar_one_or_none()
    if not prop: raise HTTPException(404, "Not found")
    active = (await db.execute(
        select(LeaseContract).where(LeaseContract.property_id == id, LeaseContract.status == ContractStatus.active)
    )).scalar_one_or_none()
    if active: raise HTTPException(400, "Cannot delete property with active contracts")
    await db.delete(prop)
    await db.commit()
    return {"ok": True}

@prop_router.get("/{id}", response_model=PropertyResponse)
async def read_prop(id: uuid.UUID, db: AsyncSession = Depends(get_session), curr_user: User = Depends(get_current_user)):
    stmt = select(Property).options(selectinload(Property.owner)).where(Property.id == id)
    
    # Role-based access
    if curr_user.role == UserRole.tenant:
        stmt = stmt.where(Property.status == PropertyStatus.available)
    elif curr_user.role == UserRole.landlord:
        stmt = stmt.where(Property.owner_id == curr_user.id)
    # Admin can see any
    
    prop = (await db.execute(stmt)).scalar_one_or_none()
    if not prop: raise HTTPException(404, "Property not found")
    return prop

tenant_router = APIRouter(prefix="/tenants", tags=["tenants"])
@tenant_router.get("", response_model=List[TenantResponse])
async def read_tenants(search: str = Query(None), db: AsyncSession = Depends(get_session), curr_user: User = landlord_access):
    stmt = select(Tenant).distinct()
    if curr_user.role == UserRole.landlord:
        contract_tenant_ids = select(LeaseContract.tenant_id).join(
            Property, Property.id == LeaseContract.property_id
        ).where(Property.owner_id == curr_user.id)
        stmt = stmt.where(or_(
            Tenant.id.in_(contract_tenant_ids),
            Tenant.created_by_id == curr_user.id,
        ))
    if search:
        stmt = stmt.where(or_(Tenant.name.ilike(f"%{search}%"), Tenant.phone.ilike(f"%{search}%")))
    return (await db.execute(stmt)).scalars().all()

@tenant_router.post("", response_model=TenantResponse)
async def create_tenant(tin: TenantCreate, db: AsyncSession = Depends(get_session), curr_user: User = landlord_access):
    t = Tenant(**tin.model_dump(), created_by_id=curr_user.id)
    db.add(t); await db.commit(); await db.refresh(t); return t

contract_router = APIRouter(prefix="/contracts", tags=["contracts"])
@contract_router.get("", response_model=List[ContractResponse])
async def read_contracts(db: AsyncSession = Depends(get_session), curr_user: User = Depends(get_current_user)):
    stmt = select(LeaseContract).options(
        selectinload(LeaseContract.payments),
        selectinload(LeaseContract.property).selectinload(Property.owner),
        selectinload(LeaseContract.tenant)
    )
    if curr_user.role == UserRole.landlord:
        stmt = stmt.join(Property).where(Property.owner_id == curr_user.id)
    elif curr_user.role == UserRole.tenant:
        stmt = stmt.join(Tenant).where(Tenant.user_id == curr_user.id)
    return (await db.execute(stmt)).scalars().all()
@contract_router.post("", response_model=ContractResponse)
async def create_contract(cin: ContractCreate, db: AsyncSession = Depends(get_session), curr_user: User = landlord_access):
    prop = await db.get(Property, cin.property_id)
    if not prop or prop.status != PropertyStatus.available: raise HTTPException(400, "Property unavailable")

    data = cin.model_dump()
    if data.get('number') is None: data.pop('number', None)

    c = LeaseContract(**data)
    prop.status = PropertyStatus.rented
    db.add(c); await db.flush()
    await generate_payment_schedule(db, c); await db.refresh(c, ['payments'])
    await db.commit()

    stmt2 = select(LeaseContract).options(
        selectinload(LeaseContract.payments),
        selectinload(LeaseContract.property).selectinload(Property.owner),
        selectinload(LeaseContract.tenant),
    ).where(LeaseContract.id == c.id)
    return (await db.execute(stmt2)).scalar_one()

@contract_router.patch("/{id}/passport", response_model=ContractResponse)
async def update_contract_passport(
    id: uuid.UUID,
    data: ContractPassportUpdate,
    db: AsyncSession = Depends(get_session),
    curr_user: User = Depends(get_current_user),
):
    stmt = select(LeaseContract).options(
        selectinload(LeaseContract.payments),
        selectinload(LeaseContract.property).selectinload(Property.owner),
        selectinload(LeaseContract.tenant),
    ).where(LeaseContract.id == id)
    c = (await db.execute(stmt)).scalar_one_or_none()
    if not c: raise HTTPException(404, "Not found")

    # Check access: landlord owns property, tenant is party to contract
    if curr_user.role == UserRole.landlord:
        prop = await db.get(Property, c.property_id)
        if not prop or prop.owner_id != curr_user.id: raise HTTPException(403, "No access")
    elif curr_user.role == UserRole.tenant:
        tenant = (await db.execute(select(Tenant).where(Tenant.user_id == curr_user.id))).scalar_one_or_none()
        if not tenant or tenant.id != c.tenant_id: raise HTTPException(403, "No access")

    for field, val in data.model_dump(exclude_none=True).items():
        setattr(c, field, val)
    await db.commit()
    await db.refresh(c)
    return (await db.execute(stmt)).scalar_one()

payment_router = APIRouter(prefix="/payments", tags=["payments"])
@payment_router.get("", response_model=List[PaymentResponse])
async def read_payments(status: PaymentStatus = None, db: AsyncSession = Depends(get_session), curr_user: User = Depends(get_current_user)):
    stmt = (
        select(Payment)
        .options(
            selectinload(Payment.contract).selectinload(LeaseContract.property).selectinload(Property.owner)
        )
        .join(LeaseContract)
    )
    if curr_user.role == UserRole.landlord:
        stmt = stmt.join(Property, LeaseContract.property_id == Property.id).where(Property.owner_id == curr_user.id)
    elif curr_user.role == UserRole.tenant:
        stmt = stmt.join(Tenant, LeaseContract.tenant_id == Tenant.id).where(Tenant.user_id == curr_user.id)
    if status: stmt = stmt.where(Payment.status == status)
    return (await db.execute(stmt)).scalars().all()

@payment_router.patch("/{id}/pay", response_model=PaymentResponse)
async def pay(id: uuid.UUID, db: AsyncSession = Depends(get_session), curr_user: User = tenant_access):
    p = await db.get(Payment, id)
    if not p: raise HTTPException(404, "Not found")
    p.status = PaymentStatus.paid
    p.paid_date = date.today()
    await db.commit()
    stmt = (
        select(Payment)
        .options(selectinload(Payment.contract).selectinload(LeaseContract.property).selectinload(Property.owner))
        .where(Payment.id == id)
    )
    return (await db.execute(stmt)).scalar_one()

@payment_router.post("/update_overdue")
async def trigger_overdue(bg: BackgroundTasks, db: AsyncSession = Depends(get_session), curr_user: User = landlord_access):
    bg.add_task(mark_overdue_payments, db); return {"msg": "Task queued"}

conv_router = APIRouter(prefix="/conversations", tags=["conversations"])

def _conv_options():
    return [
        selectinload(Conversation.property),
        selectinload(Conversation.tenant),
        selectinload(Conversation.landlord),
        selectinload(Conversation.messages).selectinload(Message.sender),
    ]

def _unread_count(conv: Conversation, viewer_id) -> int:
    return sum(1 for m in conv.messages if not m.is_read and str(m.sender_id) != str(viewer_id))

@contract_router.patch("/{id}/status", response_model=ContractResponse)
async def update_contract_status(
    id: uuid.UUID,
    body: ContractStatusUpdate,
    db: AsyncSession = Depends(get_session),
    curr_user: User = landlord_access,
):
    load_opts = [
        selectinload(LeaseContract.payments),
        selectinload(LeaseContract.property).selectinload(Property.owner),
        selectinload(LeaseContract.tenant),
    ]
    stmt = select(LeaseContract).options(*load_opts).where(LeaseContract.id == id)
    c = (await db.execute(stmt)).scalar_one_or_none()
    if not c: raise HTTPException(404, "Not found")
    if curr_user.role == UserRole.landlord:
        prop = await db.get(Property, c.property_id)
        if not prop or prop.owner_id != curr_user.id: raise HTTPException(403, "No access")
    c.status = body.status
    if body.status in (ContractStatus.terminated, ContractStatus.finished):
        prop = await db.get(Property, c.property_id)
        if prop and prop.status == PropertyStatus.rented:
            prop.status = PropertyStatus.available
    await db.commit()
    return (await db.execute(select(LeaseContract).options(*load_opts).where(LeaseContract.id == id))).scalar_one()

@contract_router.get("/{id}/download-contract")
async def download_contract(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    curr_user: User = Depends(get_current_user),
):
    """Download lease contract as Word document"""
    from src.services.contract_service import generate_contract_document
    from fastapi.responses import FileResponse
    import io
    import os
    
    # Fetch contract
    c = (await db.execute(
        select(LeaseContract).options(
            selectinload(LeaseContract.property),
            selectinload(LeaseContract.tenant)
        ).where(LeaseContract.id == id)
    )).scalar_one_or_none()
    
    if not c: raise HTTPException(404, "Contract not found")
    
    # Check access
    if curr_user.role == UserRole.landlord:
        prop = await db.get(Property, c.property_id)
        if not prop or prop.owner_id != curr_user.id: 
            raise HTTPException(403, "No access to this contract")
    elif curr_user.role == UserRole.tenant:
        if c.tenant_id != curr_user.id:
            # Check if tenant is linked to user
            tenant = await db.get(Tenant, c.tenant_id)
            if not tenant or tenant.user_id != curr_user.id:
                raise HTTPException(403, "No access to this contract")
    
    # Generate document
    doc = await generate_contract_document(db, id)
    
    # Save to bytes
    doc_bytes = io.BytesIO()
    doc.save(doc_bytes)
    doc_bytes.seek(0)
    
    return FileResponse(
        io.BytesIO(doc_bytes.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"contract_{c.number}.docx"
    )

@conv_router.post("", response_model=ConversationResponse)
async def start_conversation(
    body: ConversationCreate,
    db: AsyncSession = Depends(get_session),
    curr_user: User = Depends(get_current_user),
):
    if curr_user.role not in (UserRole.tenant, UserRole.admin):
        raise HTTPException(403, "Only tenants can start conversations")
    prop = (await db.execute(
        select(Property).options(selectinload(Property.owner)).where(Property.id == body.property_id)
    )).scalar_one_or_none()
    if not prop: raise HTTPException(404, "Property not found")
    if not prop.owner_id: raise HTTPException(400, "Property has no owner")

    # Prevent duplicate active conversations
    existing = (await db.execute(
        select(Conversation).where(
            Conversation.property_id == body.property_id,
            Conversation.tenant_user_id == curr_user.id,
            Conversation.status == ConversationStatus.active,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Conversation already exists")

    conv = Conversation(
        property_id=body.property_id,
        tenant_user_id=curr_user.id,
        landlord_user_id=prop.owner_id,
    )
    db.add(conv)
    await db.flush()
    msg = Message(conversation_id=conv.id, sender_id=curr_user.id, text=body.initial_message)
    db.add(msg)
    await db.commit()

    stmt = select(Conversation).options(*_conv_options()).where(Conversation.id == conv.id)
    conv = (await db.execute(stmt)).scalar_one()
    result = ConversationResponse.model_validate(conv)
    result.unread_count = _unread_count(conv, curr_user.id)
    return result

@conv_router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_session),
    curr_user: User = Depends(get_current_user),
):
    if curr_user.role == UserRole.admin:
        stmt = select(Conversation).options(*_conv_options())
    elif curr_user.role == UserRole.landlord:
        stmt = select(Conversation).options(*_conv_options()).where(Conversation.landlord_user_id == curr_user.id)
    else:
        stmt = select(Conversation).options(*_conv_options()).where(Conversation.tenant_user_id == curr_user.id)
    convs = (await db.execute(stmt.order_by(Conversation.updated_at.desc()))).scalars().all()
    results = []
    for c in convs:
        r = ConversationResponse.model_validate(c)
        r.unread_count = _unread_count(c, curr_user.id)
        results.append(r)
    return results

@conv_router.get("/{id}", response_model=ConversationResponse)
async def get_conversation(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    curr_user: User = Depends(get_current_user),
):
    conv = (await db.execute(
        select(Conversation).options(*_conv_options()).where(Conversation.id == id)
    )).scalar_one_or_none()
    if not conv: raise HTTPException(404, "Not found")
    if curr_user.id not in (conv.tenant_user_id, conv.landlord_user_id) and curr_user.role != UserRole.admin:
        raise HTTPException(403, "No access")

    # Mark messages from the other party as read
    await db.execute(
        Message.__table__.update()
        .where(Message.conversation_id == id, Message.sender_id != curr_user.id, Message.is_read == False)
        .values(is_read=True)
    )
    await db.commit()

    # Re-fetch with updated read status
    conv = (await db.execute(
        select(Conversation).options(*_conv_options()).where(Conversation.id == id)
    )).scalar_one()
    result = ConversationResponse.model_validate(conv)
    result.unread_count = 0
    return result

@conv_router.post("/{id}/messages", response_model=MessageResponse)
async def send_message(
    id: uuid.UUID,
    body: MessageCreate,
    db: AsyncSession = Depends(get_session),
    curr_user: User = Depends(get_current_user),
):
    conv = await db.get(Conversation, id)
    if not conv: raise HTTPException(404, "Not found")
    if curr_user.id not in (conv.tenant_user_id, conv.landlord_user_id) and curr_user.role != UserRole.admin:
        raise HTTPException(403, "No access")
    if conv.status == ConversationStatus.closed:
        raise HTTPException(400, "Conversation is closed")

    msg = Message(conversation_id=id, sender_id=curr_user.id, text=body.text)
    conv.updated_at = __import__('datetime').datetime.utcnow()
    db.add(msg)
    await db.commit()

    stmt = select(Message).options(selectinload(Message.sender)).where(Message.id == msg.id)
    msg = (await db.execute(stmt)).scalar_one()
    return msg

@conv_router.post("/{id}/contract", response_model=ContractResponse)
async def create_contract_from_conv(
    id: uuid.UUID,
    cin: ContractFromConvCreate,
    db: AsyncSession = Depends(get_session),
    curr_user: User = landlord_access,
):
    conv = await db.get(Conversation, id)
    if not conv: raise HTTPException(404, "Not found")
    if conv.landlord_user_id != curr_user.id and curr_user.role != UserRole.admin:
        raise HTTPException(403, "No access")

    prop = await db.get(Property, conv.property_id)
    if not prop or prop.status != PropertyStatus.available:
        raise HTTPException(400, "Property unavailable")

    # Find Tenant record for the tenant user
    tenant_record = (await db.execute(
        select(Tenant).where(Tenant.user_id == conv.tenant_user_id)
    )).scalar_one_or_none()
    if not tenant_record:
        raise HTTPException(400, "Tenant profile not found. The user must register as tenant first.")

    data = cin.model_dump()
    data['property_id'] = conv.property_id
    data['tenant_id'] = tenant_record.id
    if data.get('number') is None: data.pop('number', None)

    c = LeaseContract(**data)
    prop.status = PropertyStatus.rented
    conv.status = ConversationStatus.contracted
    db.add(c)
    await db.flush()
    await generate_payment_schedule(db, c)
    await db.commit()
    await db.refresh(c)

    stmt = select(LeaseContract).options(
        selectinload(LeaseContract.payments),
        selectinload(LeaseContract.property).selectinload(Property.owner),
        selectinload(LeaseContract.tenant),
    ).where(LeaseContract.id == c.id)
    return (await db.execute(stmt)).scalar_one()

@conv_router.patch("/{id}/close")
async def close_conversation(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    curr_user: User = Depends(get_current_user),
):
    conv = await db.get(Conversation, id)
    if not conv: raise HTTPException(404, "Not found")
    if curr_user.id not in (conv.tenant_user_id, conv.landlord_user_id) and curr_user.role != UserRole.admin:
        raise HTTPException(403, "No access")
    conv.status = ConversationStatus.closed
    await db.commit()
    return {"ok": True}

public_router = APIRouter(prefix="/public", tags=["public"])

@public_router.get("/properties", response_model=List[PropertyResponse])
async def public_list_props(
    city: str = Query(None),
    min_price: float = Query(None),
    max_price: float = Query(None),
    rooms: int = Query(None),
    type: str = Query(None),
    listing_type: str = Query(None),
    db: AsyncSession = Depends(get_session),
):
    stmt = (
        select(Property)
        .options(selectinload(Property.owner))
        .where(Property.status.in_([PropertyStatus.available]))
    )
    if listing_type:
        stmt = stmt.where(Property.listing_type == listing_type)
    if city: stmt = stmt.where(Property.city.ilike(f"%{city}%"))
    if rooms is not None: stmt = stmt.where(Property.rooms == rooms)
    if type: stmt = stmt.where(Property.type == type)
    if listing_type == 'sale':
        if min_price is not None: stmt = stmt.where(Property.sale_price >= min_price)
        if max_price is not None: stmt = stmt.where(Property.sale_price <= max_price)
    else:
        if min_price is not None: stmt = stmt.where(Property.base_rent >= min_price)
        if max_price is not None: stmt = stmt.where(Property.base_rent <= max_price)
    return (await db.execute(stmt)).scalars().all()

@public_router.get("/properties/{id}", response_model=PropertyResponse)
async def public_get_prop(id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    stmt = (
        select(Property)
        .options(selectinload(Property.owner))
        .where(Property.id == id, Property.status == PropertyStatus.available)
    )
    prop = (await db.execute(stmt)).scalar_one_or_none()
    if not prop: raise HTTPException(404, "Not found")
    return prop

reports_router = APIRouter(prefix="/reports", tags=["reports"])

@reports_router.get("/income")
async def income_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_session),
    curr_user: User = landlord_access
):
    stmt = (
        select(Property, func.coalesce(func.sum(Payment.amount), 0).label("income"))
        .join(LeaseContract, LeaseContract.property_id == Property.id, isouter=True)
        .join(Payment, Payment.contract_id == LeaseContract.id, isouter=True)
        .where(
            or_(
                Payment.id == None,
                (Payment.status == PaymentStatus.paid) & (Payment.paid_date >= start_date) & (Payment.paid_date <= end_date)
            )
        )
        .group_by(Property.id)
    )
    if curr_user.role == UserRole.landlord:
        stmt = stmt.where(Property.owner_id == curr_user.id)
    rows = (await db.execute(stmt)).all()
    total = sum(float(r.income) for r in rows)
    properties = [
        {
            "id": str(r.Property.id),
            "address": f"{r.Property.city}, {r.Property.street} {r.Property.house}".strip(", "),
            "type": r.Property.type,
            "status": r.Property.status,
            "income": float(r.income),
        }
        for r in rows
    ]
    return {"total_income": total, "start_date": str(start_date), "end_date": str(end_date), "properties": properties}

@reports_router.get("/upcoming")
async def upcoming_report(
    days: int = Query(30),
    db: AsyncSession = Depends(get_session),
    curr_user: User = landlord_access
):
    today = date.today()
    horizon = today + timedelta(days=days)

    pay_stmt = (
        select(Payment, LeaseContract, Property)
        .join(LeaseContract, Payment.contract_id == LeaseContract.id)
        .join(Property, LeaseContract.property_id == Property.id)
        .where(Payment.status == PaymentStatus.pending, Payment.due_date >= today, Payment.due_date <= horizon)
    )
    if curr_user.role == UserRole.landlord:
        pay_stmt = pay_stmt.where(Property.owner_id == curr_user.id)
    pay_rows = (await db.execute(pay_stmt)).all()

    contract_stmt = (
        select(LeaseContract, Property, Tenant)
        .join(Property, LeaseContract.property_id == Property.id)
        .join(Tenant, LeaseContract.tenant_id == Tenant.id)
        .where(LeaseContract.status == ContractStatus.active, LeaseContract.end_date >= today, LeaseContract.end_date <= horizon)
    )
    if curr_user.role == UserRole.landlord:
        contract_stmt = contract_stmt.where(Property.owner_id == curr_user.id)
    contract_rows = (await db.execute(contract_stmt)).all()

    return {
        "upcoming_payments": [
            {
                "payment_id": str(r.Payment.id),
                "due_date": str(r.Payment.due_date),
                "amount": float(r.Payment.amount),
                "property": f"{r.Property.city}, {r.Property.street} {r.Property.house}".strip(", "),
            }
            for r in pay_rows
        ],
        "expiring_contracts": [
            {
                "contract_id": str(r.LeaseContract.id),
                "number": r.LeaseContract.number,
                "end_date": str(r.LeaseContract.end_date),
                "tenant": r.Tenant.name,
                "property": f"{r.Property.city}, {r.Property.street} {r.Property.house}".strip(", "),
            }
            for r in contract_rows
        ],
    }

admin_router = APIRouter(prefix="/admin", tags=["admin"])

@admin_router.get("/users", response_model=List[UserResponse])
async def admin_list_users(
    search: str = Query(None),
    db: AsyncSession = Depends(get_session),
    curr_user: User = admin_only,
):
    stmt = select(User).order_by(User.created_at.desc())
    if search:
        stmt = stmt.where(or_(User.username.ilike(f"%{search}%"), User.name.ilike(f"%{search}%")))
    return (await db.execute(stmt)).scalars().all()

@admin_router.patch("/users/{id}", response_model=UserResponse)
async def admin_update_user(
    id: uuid.UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_session),
    curr_user: User = admin_only,
):
    user = await db.get(User, id)
    if not user: raise HTTPException(404, "User not found")
    for k, v in body.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return user

@admin_router.get("/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_session),
    curr_user: User = admin_only,
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_landlords = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.landlord))).scalar()
    total_tenants_users = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.tenant))).scalar()
    total_props = (await db.execute(select(func.count(Property.id)))).scalar()
    available_props = (await db.execute(select(func.count(Property.id)).where(Property.status == PropertyStatus.available))).scalar()
    rented_props = (await db.execute(select(func.count(Property.id)).where(Property.status == PropertyStatus.rented))).scalar()
    active_contracts = (await db.execute(select(func.count(LeaseContract.id)).where(LeaseContract.status == ContractStatus.active))).scalar()
    total_payments_paid = (await db.execute(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == PaymentStatus.paid))).scalar()
    total_overdue = (await db.execute(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == PaymentStatus.overdue))).scalar()
    return {
        "users": {"total": total_users, "landlords": total_landlords, "tenants": total_tenants_users},
        "properties": {"total": total_props, "available": available_props, "rented": rented_props},
        "contracts": {"active": active_contracts},
        "payments": {"total_paid": float(total_payments_paid), "total_overdue": float(total_overdue)},
    }

@admin_router.post("/geocode-all")
async def geocode_all_properties(
    db: AsyncSession = Depends(get_session),
    curr_user: User = admin_only,
):
    """Backfill lat/lng for all properties that don't have coordinates."""
    from src.services.geocoding_service import geocode_address
    props = (await db.execute(
        select(Property).where(
            (Property.latitude == None) | (Property.longitude == None)
        )
    )).scalars().all()
    updated = 0
    for p in props:
        coords = await geocode_address(p.city or '', p.street or '', p.house or '')
        if coords:
            p.latitude, p.longitude = coords
            updated += 1
    await db.commit()
    return {"geocoded": updated, "total_checked": len(props)}

# ── Currency Router ──────────────────────────────────────────────────────

currency_router = APIRouter(prefix="/currencies", tags=["currencies"])

@currency_router.get("/rates")
async def get_exchange_rates(currency_service: CurrencyService = Depends(get_currency_service)):
    """Получить текущие курсы валют"""
    return {"rates": currency_service.get_rates()}

@currency_router.get("/supported")
async def get_supported_currencies(currency_service: CurrencyService = Depends(get_currency_service)):
    """Получить список поддерживаемых валют"""
    return {"currencies": currency_service.get_supported_currencies()}

@currency_router.post("/convert")
async def convert_currency(
    amount: float = Query(..., gt=0),
    from_currency: str = Query(...),
    to_currency: str = Query(...),
    currency_service: CurrencyService = Depends(get_currency_service)
):
    """Конвертировать сумму между валютами"""
    try:
        result = currency_service.convert(amount, from_currency, to_currency)
        return {"amount": amount, "from": from_currency, "to": to_currency, "result": result}
    except ValueError as e:
        raise HTTPException(400, str(e))

@currency_router.post("/rates/update")
async def update_currency_rates(
    currency_service: CurrencyService = Depends(get_currency_service),
    curr_user: User = admin_only
):
    """Обновить курсы валют из API (admin only)"""
    rates = await currency_service.update_rates_from_api()
    return {"rates": rates}
