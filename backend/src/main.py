from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from src.api.v1.endpoints import auth_router, prop_router, tenant_router, contract_router, payment_router, reports_router, conv_router, public_router, admin_router, currency_router

app = FastAPI(title=settings.PROJECT_NAME)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for router in [auth_router, prop_router, tenant_router, contract_router, payment_router, reports_router, conv_router, public_router, admin_router, currency_router]:
    app.include_router(router, prefix="/api/v1")
