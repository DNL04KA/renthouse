"""
Final seed script — fills DB with realistic Minsk real estate data.
Run: python3 seed_final.py
"""
import asyncio
import uuid
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select

DATABASE_URL = "postgresql+asyncpg://nesterovichdaniil@localhost:5432/rental_db"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ── Bcrypt hash via app's own security module ─────────────────────────────────
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from src.core.security import get_password_hash

def h(password: str) -> str:
    return get_password_hash(password)

# ── Unsplash images (stable, no auth needed) ──────────────────────────────────
IMGS = {
    "apt1":  ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=900&h=600&fit=crop"],
    "apt2":  ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&h=600&fit=crop"],
    "apt3":  ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=900&h=600&fit=crop"],
    "apt4":  ["https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=900&h=600&fit=crop"],
    "apt5":  ["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=900&h=600&fit=crop"],
    "apt6":  ["https://images.unsplash.com/photo-1554995207-c18c203602cb?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=900&h=600&fit=crop"],
    "studio":["https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1630699375896-8e679b75a7a5?w=900&h=600&fit=crop"],
    "office":["https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=900&h=600&fit=crop"],
    "wh":    ["https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1553413077-190dd305871c?w=900&h=600&fit=crop"],
    "house": ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=900&h=600&fit=crop",
               "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=900&h=600&fit=crop"],
}

AMENITIES_BASE  = ["Лифт", "Домофон", "Интернет", "Кабельное ТВ"]
AMENITIES_PREM  = ["Парковка", "Охрана", "Видеонаблюдение", "Консьерж"]
AMENITIES_APT   = ["Кондиционер", "Посудомойка", "Стиральная машина", "Балкон", "Встроенная кухня"]
AMENITIES_OFF   = ["Переговорная комната", "Кухня", "Принтер/Сканер", "Открытый план"]

async def seed():
    async with async_session() as db:
        # ── 0. Wipe all existing data (cascade) ──────────────────────────────
        print("Очищаю базу данных...")
        for tbl in ["messages", "conversations", "payments", "lease_contracts",
                    "tenants", "properties", "users"]:
            await db.execute(text(f"DELETE FROM {tbl}"))
        await db.commit()
        print("  ✓ Очищено")

        # ── 1. Users ──────────────────────────────────────────────────────────
        print("Создаю пользователей...")

        now = datetime.utcnow()

        # Admin
        admin_id = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO users (id, username, password_hash, role, is_active,
                name, first_name, last_name, patronymic, birth_date, phone, address, created_at, updated_at)
            VALUES (:id, :u, :p, 'admin', true,
                :name, :fn, :ln, :pat, :bd, :ph, :addr, :now, :now)
        """), {
            "id": admin_id, "u": "admin", "p": h("admin123"),
            "name": "Администратор системы",
            "fn": "Дмитрий", "ln": "Соколов", "pat": "Андреевич",
            "bd": date(1985, 3, 12), "ph": "+375171234567",
            "addr": "г. Минск, пр. Независимости, 1", "now": now,
        })

        # Landlords
        landlords = [
            {
                "id": uuid.uuid4(), "u": "aleksey_ivanov", "fn": "Алексей", "ln": "Иванов", "pat": "Петрович",
                "bd": date(1978, 6, 25), "ph": "+375291112233", "addr": "г. Минск, ул. Ленина, 4, кв. 12",
            },
            {
                "id": uuid.uuid4(), "u": "ksusha_morozova", "fn": "Ксения", "ln": "Морозова", "pat": "Владимировна",
                "bd": date(1990, 11, 8), "ph": "+375337778899", "addr": "г. Минск, пр. Победителей, 10, кв. 45",
            },
            {
                "id": uuid.uuid4(), "u": "sergey_kozlov", "fn": "Сергей", "ln": "Козлов", "pat": "Михайлович",
                "bd": date(1975, 2, 14), "ph": "+375296665544", "addr": "г. Минск, ул. Немига, 5, кв. 3",
            },
        ]
        landlord_ids = []
        for ll in landlords:
            name = f"{ll['ln']} {ll['fn']} {ll['pat']}"
            await db.execute(text("""
                INSERT INTO users (id, username, password_hash, role, is_active,
                    name, first_name, last_name, patronymic, birth_date, phone, address, created_at, updated_at)
                VALUES (:id, :u, :p, 'landlord', true,
                    :name, :fn, :ln, :pat, :bd, :ph, :addr, :now, :now)
            """), {**ll, "p": h("landlord123"), "name": name, "now": now})
            landlord_ids.append(ll["id"])

        # Tenants (users)
        tenants_data = [
            {
                "id": uuid.uuid4(), "u": "maria_volkova", "fn": "Мария", "ln": "Волкова", "pat": "Сергеевна",
                "bd": date(1995, 4, 18), "ph": "+375295551122", "addr": "г. Минск, ул. Маркса, 14, кв. 7",
            },
            {
                "id": uuid.uuid4(), "u": "ivan_petrov", "fn": "Иван", "ln": "Петров", "pat": "Александрович",
                "bd": date(1992, 9, 3), "ph": "+375291234567", "addr": "г. Минск, ул. Тимирязева, 30, кв. 22",
            },
            {
                "id": uuid.uuid4(), "u": "anna_smirnova", "fn": "Анна", "ln": "Смирнова", "pat": "Игоревна",
                "bd": date(1998, 12, 27), "ph": "+375449876543", "addr": "г. Минск, ул. Сурганова, 9, кв. 55",
            },
            {
                "id": uuid.uuid4(), "u": "dmitry_lebedev", "fn": "Дмитрий", "ln": "Лебедев", "pat": "Николаевич",
                "bd": date(1988, 7, 11), "ph": "+375333214321", "addr": "г. Гродно, ул. Советская, 12, кв. 8",
            },
        ]
        tenant_user_ids = []
        for tt in tenants_data:
            name = f"{tt['ln']} {tt['fn']} {tt['pat']}"
            await db.execute(text("""
                INSERT INTO users (id, username, password_hash, role, is_active,
                    name, first_name, last_name, patronymic, birth_date, phone, address, created_at, updated_at)
                VALUES (:id, :u, :p, 'tenant', true,
                    :name, :fn, :ln, :pat, :bd, :ph, :addr, :now, :now)
            """), {**tt, "p": h("tenant123"), "name": name, "now": now})
            tenant_user_ids.append(tt["id"])

        await db.commit()
        print(f"  ✓ {1 + len(landlords) + len(tenants_data)} пользователей")

        # ── 2. Tenant profiles ────────────────────────────────────────────────
        print("Создаю профили арендаторов...")
        tenant_profile_ids = []
        tenant_profile_data = [
            {"name": "Волкова Мария Сергеевна",   "phone": "+375295551122", "email": "maria.volkova@gmail.com"},
            {"name": "Петров Иван Александрович",  "phone": "+375291234567", "email": "ivan.petrov@mail.ru"},
            {"name": "Смирнова Анна Игоревна",     "phone": "+375449876543", "email": "anna.smirnova@yandex.by"},
            {"name": "Лебедев Дмитрий Николаевич", "phone": "+375333214321", "email": "d.lebedev@tut.by"},
        ]
        for i, (tpd, tuid) in enumerate(zip(tenant_profile_data, tenant_user_ids)):
            tid = uuid.uuid4()
            await db.execute(text("""
                INSERT INTO tenants (id, user_id, type, name, phone, email, created_at, updated_at)
                VALUES (:id, :uid, 'individual', :name, :phone, :email, :now, :now)
            """), {"id": tid, "uid": tuid, **tpd, "now": now})
            tenant_profile_ids.append(tid)
        await db.commit()
        print(f"  ✓ {len(tenant_profile_ids)} профилей арендаторов")

        # ── 3. Properties ─────────────────────────────────────────────────────
        print("Создаю объекты недвижимости...")

        props = [
            # ──── Аренда квартиры ────────────────────────────────────────────
            {
                "owner": landlords[0]["id"],
                "listing_type": "rent", "type": "flat", "status": "available",
                "city": "Минск", "street": "пр. Независимости", "house": "58", "unit": "104",
                "country": "Беларусь", "area": 65.0, "rooms": 2, "floor": 7, "total_floors": 16,
                "base_rent": 950.0, "sale_price": None,
                "lat": 53.9227, "lng": 27.5901,
                "description": "Уютная 2-комнатная квартира в самом центре Минска. Современный евроремонт, новая мебель и бытовая техника. Развитая инфраструктура — рядом метро «Площадь Победы», ТЦ «Галилео», рестораны и кафе. Панорамный вид из окна на проспект.",
                "images": IMGS["apt1"],
                "amenities": AMENITIES_BASE + ["Кондиционер", "Стиральная машина", "Балкон", "Мебель"],
            },
            {
                "owner": landlords[0]["id"],
                "listing_type": "rent", "type": "flat", "status": "rented",
                "city": "Минск", "street": "ул. Немига", "house": "3", "unit": "28",
                "country": "Беларусь", "area": 42.5, "rooms": 1, "floor": 4, "total_floors": 9,
                "base_rent": 620.0, "sale_price": None,
                "lat": 53.9027, "lng": 27.5529,
                "description": "Компактная 1-комнатная квартира у станции метро «Немига». Идеально для молодых специалистов. Тихий двор, консьерж, охраняемая парковка. Квартира полностью укомплектована.",
                "images": IMGS["studio"],
                "amenities": AMENITIES_BASE + ["Кондиционер", "Мебель", "Встроенная кухня"],
            },
            {
                "owner": landlords[1]["id"],
                "listing_type": "rent", "type": "flat", "status": "available",
                "city": "Минск", "street": "пр. Победителей", "house": "7А", "unit": "512",
                "country": "Беларусь", "area": 88.0, "rooms": 3, "floor": 14, "total_floors": 22,
                "base_rent": 1350.0, "sale_price": None,
                "lat": 53.9139, "lng": 27.5340,
                "description": "Просторная 3-комнатная квартира с видом на Свислочь и Троицкое предместье. Дизайнерский ремонт, умный дом, встроенная техника Siemens. Закрытая охраняемая территория, подземный паркинг. Престижный жилой комплекс бизнес-класса.",
                "images": IMGS["apt2"],
                "amenities": AMENITIES_BASE + AMENITIES_PREM + AMENITIES_APT,
            },
            {
                "owner": landlords[1]["id"],
                "listing_type": "rent", "type": "flat", "status": "available",
                "city": "Минск", "street": "ул. Ленина", "house": "18", "unit": "7",
                "country": "Беларусь", "area": 55.0, "rooms": 2, "floor": 3, "total_floors": 5,
                "base_rent": 800.0, "sale_price": None,
                "lat": 53.9049, "lng": 27.5614,
                "description": "Квартира в историческом центре Минска в доме сталинской постройки. Высокие потолки 3.2 м, паркет, лепнина. Рядом Национальная библиотека, Верховный суд. Тихая улица.",
                "images": IMGS["apt3"],
                "amenities": AMENITIES_BASE + ["Балкон", "Встроенная кухня", "Мебель"],
            },
            {
                "owner": landlords[2]["id"],
                "listing_type": "rent", "type": "flat", "status": "available",
                "city": "Минск", "street": "ул. Тимирязева", "house": "62", "unit": "315",
                "country": "Беларусь", "area": 47.0, "rooms": 1, "floor": 11, "total_floors": 19,
                "base_rent": 540.0, "sale_price": None,
                "lat": 53.9285, "lng": 27.5948,
                "description": "Светлая студия в современном монолитном доме 2020 года постройки. Панорамное остекление, вид на парк. 7 минут до метро «Пушкинская». Интернет 200 Мбит/с включён в стоимость.",
                "images": IMGS["studio"],
                "amenities": AMENITIES_BASE + ["Кондиционер", "Стиральная машина", "Интернет включён"],
            },
            {
                "owner": landlords[2]["id"],
                "listing_type": "rent", "type": "flat", "status": "available",
                "city": "Минск", "street": "ул. Сурганова", "house": "5", "unit": "89",
                "country": "Беларусь", "area": 72.0, "rooms": 3, "floor": 6, "total_floors": 12,
                "base_rent": 1100.0, "sale_price": None,
                "lat": 53.9169, "lng": 27.5755,
                "description": "3-комнатная квартира в экологически чистом районе рядом с Ботаническим садом. Просторные комнаты, большая кухня 16 м². Свежий ремонт 2023 года. Рядом школы, детские сады, супермаркеты.",
                "images": IMGS["apt4"],
                "amenities": AMENITIES_BASE + ["Балкон", "Кладовая", "Встроенная кухня", "Парковка"],
            },
            # ──── Аренда офисов ───────────────────────────────────────────────
            {
                "owner": landlords[0]["id"],
                "listing_type": "rent", "type": "office", "status": "available",
                "city": "Минск", "street": "ул. Маркса", "house": "22", "unit": "Офис 3",
                "country": "Беларусь", "area": 120.0, "rooms": None, "floor": 2, "total_floors": 5,
                "base_rent": 2800.0, "sale_price": None,
                "lat": 53.9010, "lng": 27.5595,
                "description": "Офисное помещение в центре Минска. Открытая планировка, 2 переговорные комнаты, зона ресепшн. Отдельный вход с улицы. Высокоскоростной интернет, охрана 24/7. Возможность аренды парковочных мест.",
                "images": IMGS["office"],
                "amenities": AMENITIES_OFF + ["Охрана 24/7", "Парковка", "Кондиционирование", "Серверная"],
            },
            {
                "owner": landlords[2]["id"],
                "listing_type": "rent", "type": "warehouse", "status": "available",
                "city": "Минск", "street": "ул. Промышленная", "house": "14", "unit": None,
                "country": "Беларусь", "area": 350.0, "rooms": None, "floor": 1, "total_floors": 1,
                "base_rent": 3200.0, "sale_price": None,
                "lat": 53.8810, "lng": 27.5210,
                "description": "Современный складской комплекс класса B+. Высота потолков 8 м, ворота для еврофуры, 2 рампы, отопление. Охраняемая территория с видеонаблюдением. Въезд для большегрузных автомобилей. Офисный блок 40 м² в стоимость включён.",
                "images": IMGS["wh"],
                "amenities": ["Рампа", "Ворота для фуры", "Отопление", "Охрана", "Видеонаблюдение", "Офисный блок"],
            },
            # ──── Продажа ─────────────────────────────────────────────────────
            {
                "owner": landlords[1]["id"],
                "listing_type": "sale", "type": "flat", "status": "available",
                "city": "Минск", "street": "ул. Притыцкого", "house": "44", "unit": "207",
                "country": "Беларусь", "area": 75.5, "rooms": 3, "floor": 8, "total_floors": 16,
                "base_rent": 1100.0, "sale_price": 98000.0,
                "lat": 53.9167, "lng": 27.4654,
                "description": "Отличная 3-комнатная квартира в новостройке 2022 года. Черновая отделка — возможность сделать ремонт под себя. Просторные комнаты, большие окна. Закрытый двор, видеонаблюдение, детская площадка. Рядом ТЦ «Тивали».",
                "images": IMGS["apt5"],
                "amenities": AMENITIES_BASE + AMENITIES_PREM + ["Закрытый двор", "Детская площадка"],
            },
            {
                "owner": landlords[0]["id"],
                "listing_type": "sale", "type": "flat", "status": "available",
                "city": "Минск", "street": "ул. Городской Вал", "house": "8", "unit": "11",
                "country": "Беларусь", "area": 95.0, "rooms": 4, "floor": 5, "total_floors": 9,
                "base_rent": 1500.0, "sale_price": 145000.0,
                "lat": 53.9005, "lng": 27.5492,
                "description": "Просторная 4-комнатная квартира в самом центре Минска, в 3 минутах от метро «Немига». Дом 2010 года, кирпич. Евроремонт 2021 года, встроенная немецкая кухня, гардеробная. Вид на Троицкое предместье и реку Свислочь.",
                "images": IMGS["apt6"],
                "amenities": AMENITIES_BASE + AMENITIES_PREM + AMENITIES_APT,
            },
            {
                "owner": landlords[2]["id"],
                "listing_type": "sale", "type": "other", "status": "available",
                "city": "Минск", "street": "ул. Маяковского", "house": "115А", "unit": None,
                "country": "Беларусь", "area": 180.0, "rooms": None, "floor": 1, "total_floors": 2,
                "base_rent": 3500.0, "sale_price": 220000.0,
                "lat": 53.9082, "lng": 27.6018,
                "description": "Коммерческое здание под офисный центр или ресторан. Два этажа, отдельный вход, большой зал 140 м². Всё коммуникации подведены. Парковка на 12 мест во дворе. Идеально для бизнеса — рядом крупные жилые массивы.",
                "images": IMGS["office"],
                "amenities": ["Отдельный вход", "Парковка 12 мест", "Все коммуникации", "Сигнализация"],
            },
        ]

        prop_ids = []
        for p in props:
            pid = uuid.uuid4()
            await db.execute(text("""
                INSERT INTO properties (
                    id, owner_id, listing_type, type, status,
                    city, street, house, unit, country,
                    area, rooms, floor, total_floors,
                    base_rent, sale_price, latitude, longitude,
                    description, images, amenities,
                    created_at, updated_at
                ) VALUES (
                    :id, :owner, :lt, :type, :status,
                    :city, :street, :house, :unit, :country,
                    :area, :rooms, :floor, :tf,
                    :rent, :sale, :lat, :lng,
                    :desc, :images, :amenities,
                    :now, :now
                )
            """), {
                "id": pid,
                "owner": p["owner"],
                "lt": p["listing_type"],
                "type": p["type"],
                "status": p["status"],
                "city": p["city"],
                "street": p["street"],
                "house": p["house"],
                "unit": p.get("unit"),
                "country": p.get("country", "Беларусь"),
                "area": p["area"],
                "rooms": p.get("rooms"),
                "floor": p.get("floor"),
                "tf": p.get("total_floors"),
                "rent": p["base_rent"],
                "sale": p.get("sale_price"),
                "lat": p["lat"],
                "lng": p["lng"],
                "desc": p["description"],
                "images": p["images"],
                "amenities": p["amenities"],
                "now": now,
            })
            prop_ids.append((pid, p["status"], p["listing_type"]))

        await db.commit()
        print(f"  ✓ {len(prop_ids)} объектов недвижимости")

        # ── 4. Contracts & payments for rented properties ─────────────────────
        print("Создаю договоры и платежи...")
        rented = [(pid, lt) for pid, st, lt in prop_ids if st == "rented"]

        contract_ids = []
        for i, (pid, _) in enumerate(rented):
            cid = uuid.uuid4()
            tid = tenant_profile_ids[i % len(tenant_profile_ids)]
            cnt_num = f"CNT-202601{i+1:02d}-{str(cid)[:4].upper()}"
            await db.execute(text("""
                INSERT INTO lease_contracts (
                    id, number, property_id, tenant_id,
                    start_date, end_date, rent_amount, payment_period,
                    deposit_amount, status, contract_type,
                    signing_city, signing_date,
                    created_at, updated_at
                ) VALUES (
                    :id, :num, :pid, :tid,
                    :sd, :ed, :rent, 'month',
                    :dep, 'active', 'standard',
                    'Минск', :sd,
                    :now, :now
                )
            """), {
                "id": cid, "num": cnt_num, "pid": pid, "tid": tid,
                "sd": date(2026, 1, 1), "ed": date(2026, 12, 31),
                "rent": 800.0 if i == 0 else 620.0,
                "dep": 800.0,
                "now": now,
            })
            contract_ids.append((cid, 800.0 if i == 0 else 620.0))

        await db.commit()

        # Payments for each contract (Jan–Dec 2026, some paid)
        for cid, amt in contract_ids:
            for month in range(1, 13):
                pay_id = uuid.uuid4()
                due = date(2026, month, 5)
                is_paid = month <= 4  # Jan–Apr paid
                await db.execute(text("""
                    INSERT INTO payments (id, contract_id, due_date, paid_date, amount, status, created_at, updated_at)
                    VALUES (:id, :cid, :due, :paid, :amt, :st, :now, :now)
                """), {
                    "id": pay_id, "cid": cid, "due": due,
                    "paid": date(2026, month, 3) if is_paid else None,
                    "amt": amt,
                    "st": "paid" if is_paid else ("overdue" if month < 5 else "pending"),
                    "now": now,
                })

        await db.commit()
        print(f"  ✓ {len(contract_ids)} договоров + {len(contract_ids)*12} платежей")

        # ── 5. Sample conversations ────────────────────────────────────────────
        print("Создаю переписки...")
        # Tenant 1 asks landlord 1 about available property
        avail_prop = next((pid for pid, st, lt in prop_ids if st == "available" and lt == "rent"), None)
        if avail_prop:
            conv_id = uuid.uuid4()
            await db.execute(text("""
                INSERT INTO conversations (id, property_id, tenant_id, landlord_id, status, created_at, updated_at)
                VALUES (:id, :pid, :tid, :lid, 'active', :now, :now)
            """), {
                "id": conv_id, "pid": avail_prop,
                "tid": tenant_user_ids[0], "lid": landlords[0]["id"], "now": now
            })
            msgs = [
                (tenant_user_ids[0], "Здравствуйте! Интересует квартира на пр. Независимости. Актуальна ли аренда?"),
                (landlords[0]["id"], "Добрый день, Мария! Да, квартира свободна. Когда вам удобно посмотреть?"),
                (tenant_user_ids[0], "Могу в четверг вечером после 18:00, вам подходит?"),
                (landlords[0]["id"], "Отлично, договорились! В четверг в 18:30 жду вас. Адрес: пр. Независимости, 58, кв. 104. Позвоните за 15 минут."),
            ]
            for sender_id, text_msg in msgs:
                await db.execute(text("""
                    INSERT INTO messages (id, conversation_id, sender_id, text, is_read, created_at, updated_at)
                    VALUES (:id, :cid, :sid, :txt, true, :now, :now)
                """), {"id": uuid.uuid4(), "cid": conv_id, "sid": sender_id, "txt": text_msg, "now": now})

        await db.commit()
        print("  ✓ Переписки созданы")

        # ── Summary ───────────────────────────────────────────────────────────
        print()
        print("=" * 50)
        print("  БАЗА ДАННЫХ ЗАПОЛНЕНА УСПЕШНО")
        print("=" * 50)
        print()
        print("  АККАУНТЫ ДЛЯ ВХОДА:")
        print(f"  admin            / admin123      (Администратор)")
        print(f"  aleksey_ivanov   / landlord123   (Арендодатель — Иванов А.П.)")
        print(f"  ksusha_morozova  / landlord123   (Арендодатель — Морозова К.В.)")
        print(f"  sergey_kozlov    / landlord123   (Арендодатель — Козлов С.М.)")
        print(f"  maria_volkova    / tenant123     (Арендатор — Волкова М.С.)")
        print(f"  ivan_petrov      / tenant123     (Арендатор — Петров И.А.)")
        print(f"  anna_smirnova    / tenant123     (Арендатор — Смирнова А.И.)")
        print(f"  dmitry_lebedev   / tenant123     (Арендатор — Лебедев Д.Н.)")
        print()
        print(f"  Объектов:  {len(prop_ids)} (8 аренда, 3 продажа)")
        print(f"  Договоров: {len(contract_ids)}")
        print(f"  Платежей:  {len(contract_ids)*12}")

asyncio.run(seed())
