# RentHouse

Property rental management system: a public listings catalogue plus role-based
dashboards for landlords, tenants and administrators.

FastAPI and PostgreSQL on the back end, React and Ant Design on the front end.
Built as a diploma project.

Live front end: https://renthouse-sigma.vercel.app

## Quick start

### With Docker

```bash
docker-compose up --build
```

- Front end: http://localhost:5173
- API: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs

### Without Docker

Requirements: PostgreSQL 12+, Python 3.11+, Node.js 18+.

Back end:

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python seed_admin.py        # creates the admin account
python seed_marketplace.py  # demo properties
python seed_data.py         # demo contracts and payments
uvicorn src.main:app --reload --port 8000
```

Front end:

```bash
cd frontend
npm install
npm run dev
```

The front end reads the API URL from `VITE_API_URL` and falls back to
`http://localhost:8000/api/v1`.

The seed scripts create an administrator with a default password. Change it
before exposing an instance to the internet.

## Features by role

**Guest** — public catalogue of properties for rent and for sale, property
details, filters by city, price, type, rooms and listing type, a map view of
listings, registration and login.

**Tenant** — own lease contracts, payment schedule, paying a due payment,
payment history, personal dashboard.

**Landlord** — properties (create, edit, status), tenants, lease contracts with
DOCX export, payments and overdue tracking, messaging with tenants, reports,
per-property statistics.

**Administrator** — everything above plus user management and currency
management.

## Stack

**Back end** — FastAPI, SQLAlchemy 2 (async) with asyncpg, Alembic migrations,
PostgreSQL, Pydantic v2, JWT auth with passlib/bcrypt, python-docx.

**Front end** — React 18, TypeScript, Vite 5, Ant Design 5, React Router 6,
TanStack Query, Axios, Leaflet (react-leaflet) for maps, docx + file-saver for
contract export.

**Infrastructure** — Docker and Docker Compose, nginx for the production front
end bundle.

## API

All routes live under `/api/v1`, grouped into routers: `auth`, `properties`,
`tenants`, `contracts`, `payments`, `conversations`, `public`, `reports`,
`admin`, `currencies`. The full, always-current reference is the generated
Swagger UI at `/docs`.

## Project structure

```
backend/
  src/
    main.py                 FastAPI app
    api/v1/endpoints.py     routers
    models/all_models.py    SQLAlchemy models
    schemas/all_schemas.py  Pydantic schemas
    services/               business logic
    core/                   config, database, security
  alembic/                  migrations
  seed_*.py                 demo data
frontend/
  src/
    pages/                  screens (catalogue, dashboard, contracts, payments, …)
    layouts/                public and dashboard layouts
    components/             shared components, including the map
    api/client.ts           axios clients (authenticated and public)
docker-compose.yml
```

`docs/diagrams/` holds the diagrams produced for the written part of the project
(use case, IDEF0, DFD, database schema); `docs/reports/` holds the progress
notes written while building it.

## Data model

Users with roles (admin / landlord / tenant), properties, tenants, lease
contracts, payments, and conversations with messages. Properties support both
rent and sale listings and multiple currencies.
