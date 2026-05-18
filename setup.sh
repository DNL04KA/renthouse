#!/bin/bash

# RentHouse Project Local Startup Script
# This script checks dependencies and helps start the project locally

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "================================"
echo "RentHouse Local Development Setup"
echo "================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python
echo -e "\n${YELLOW}Checking Python...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | awk '{print $2}')
    echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"
else
    echo -e "${RED}✗ Python 3 not found. Please install Python 3.11+${NC}"
    exit 1
fi

# Check Node.js
echo -e "\n${YELLOW}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION found${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check PostgreSQL
echo -e "\n${YELLOW}Checking PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL found${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL not found locally${NC}"
    echo -e "${YELLOW}  Options:${NC}"
    echo -e "  1. Install PostgreSQL: brew install postgresql@15"
    echo -e "  2. Use Docker: docker-compose up"
    echo -e "  3. Use cloud PostgreSQL (e.g., Heroku, AWS RDS)"
fi

# Check Docker
echo -e "\n${YELLOW}Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker found$(docker --version)${NC}"
    echo -e "\n${GREEN}Recommend using: docker-compose up${NC}"
    exit 0
fi

# Setup Backend
echo -e "\n${YELLOW}Setting up Backend...${NC}"
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo -e "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo -e "Installing dependencies..."
pip install -q -r requirements.txt

# Setup Frontend
echo -e "\n${YELLOW}Setting up Frontend...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "Installing npm dependencies..."
    npm install --quiet
fi

echo -e "\n${GREEN}✓ Setup completed!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Start PostgreSQL (if not running):"
echo -e "   - Local: brew services start postgresql@15"
echo -e "   - Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15"
echo -e ""
echo -e "2. Run database migrations:"
echo -e "   cd backend && source venv/bin/activate && alembic upgrade head"
echo -e ""
echo -e "3. (Optional) Seed test data:"
echo -e "   cd backend && python seed_admin.py && python seed_marketplace.py"
echo -e ""
echo -e "4. Start Backend (in one terminal):"
echo -e "   cd backend && source venv/bin/activate && uvicorn src.main:app --reload"
echo -e ""
echo -e "5. Start Frontend (in another terminal):"
echo -e "   cd frontend && npm run dev"
echo -e ""
echo -e "${GREEN}Or use Docker Compose (easiest):${NC}"
echo -e "   docker-compose up"
