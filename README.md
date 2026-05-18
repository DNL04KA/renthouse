# RentHouse - Система управления арендой недвижимости

## Быстрый старт

### Требования
- Docker и Docker Compose (рекомендуется)
- или PostgreSQL 12+ + Node.js 18+ + Python 3.11+

### Вариант 1: С Docker (рекомендуется)

```bash
cd /Users/nesterovichdaniil/Desktop/diplomkzentag
docker-compose up --build
```

Приложение будет доступно:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Вариант 2: Локальный запуск (требует PostgreSQL)

#### Backend

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Запуск миграций
alembic upgrade head

# Создание тестового администратора
python seed_admin.py

# Заполнение тестовых данных
python seed_marketplace.py
python seed_data.py

# Запуск сервера
uvicorn src.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Учетные данные для тестирования

### Администратор
- **Логин**: admin
- **Пароль**: admin123
- **Роль**: admin

### Арендодатель (владелец недвижимости)
- **Логин**: landlord1
- **Пароль**: password
- **Роль**: landlord

### Арендатор
- **Регистрация**: доступна через кнопку "Регистрация"
- **Роль**: tenant

---

## Функции по ролям

### Гость (неавторизованный)
✅ Просмотр публичного каталога недвижимости  
✅ Просмотр деталей объекта  
✅ Фильтрация по городу, цене, типу, количеству комнат  
✅ Регистрация и вход  

### Арендатор
✅ Просмотр своих договоров аренды  
✅ Просмотр графика платежей  
✅ Оплата переводов  
✅ Просмотр истории платежей  
✅ Персональный dashboard с статистикой  

### Арендодатель (владелец)
✅ Создание и управление объектами недвижимости  
✅ Добавление и управление арендаторами  
✅ Создание арендных договоров  
✅ Управление платежами  
✅ Просмотр статистики по объектам  
✅ Отслеживание просроченных платежей  
✅ Dashboard с финансовой информацией  

### Администратор
✅ Полный доступ ко всем функциям  
✅ Управление пользователями  

---

## API Endpoints

### Аутентификация
- `POST /api/v1/auth/register` - Регистрация новго пользователя
- `POST /api/v1/auth/login` - Вход в систему

### Недвижимость
- `GET /api/v1/properties` - Получить список недвижимости (с фильтрами)
- `GET /api/v1/properties/{id}` - Получить детали объекта
- `POST /api/v1/properties` - Создать новый объект (landlord/admin)

### Арендаторы
- `GET /api/v1/tenants` - Список арендаторов (landlord/admin)
- `POST /api/v1/tenants` - Добавить арендатора (landlord/admin)

### Договоры
- `GET /api/v1/contracts` - Получить договоры (фильтруются по роли)
- `POST /api/v1/contracts` - Создать договор (landlord/admin)

### Платежи
- `GET /api/v1/payments` - Получить платежи (фильтруются по роли)
- `PATCH /api/v1/payments/{id}/pay` - Оплатить платеж
- `POST /api/v1/payments/update_overdue` - Обновить просроченные платежи

---

## Исправленные проблемы

✅ Добавлен фильтр по типу недвижимости (`type`)  
✅ Исправлена регистрация арендатора (правильно сохраняется телефон)  
✅ Добавлено ограничение данных по ролям:
   - Арендодатель видит только свои объекты и платежи  
   - Арендатор видит только свои договоры и платежи  
   - Гость видит только доступные объекты  
✅ Добавлен отдельный endpoint для получения детей объекта по ID (`GET /properties/{id}`)  
✅ Исправлен статус объекта в каталоге (теперь показывает реальный статус)  
✅ Заменены локальные пути изображений на интернет-ссылки (Unsplash)  
✅ Добавлены Dockerfile и docker-compose для удобного развертывания  

---

## Структура проекта

```
diplomkzentag/
├── backend/
│   ├── src/
│   │   ├── main.py              # FastAPI приложение
│   │   ├── api/v1/endpoints.py  # API routes
│   │   ├── models/all_models.py # SQLAlchemy models
│   │   ├── schemas/all_schemas.py # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   └── core/                # Config, DB, security
│   ├── alembic/                 # Database migrations
│   ├── seed_*.py                # Test data scripts
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/               # React pages
│   │   ├── layouts/             # Layout components
│   │   ├── api/client.ts        # API client
│   │   └── main.tsx             # Entry point
│   └── package.json
└── docker-compose.yml
```

---

## Технологический стек

**Backend:**
- FastAPI 0.128.8
- SQLAlchemy 2.0+ (async)
- Alembic (migrations)
- PostgreSQL
- JWT для аутентификации
- Pydantic для валидации

**Frontend:**
- React 18.2
- Vite 5.2
- Ant Design 5.16
- React Router 6.22
- Axios для HTTP запросов
- React Query для кэширования данных

**DevOps:**
- Docker & Docker Compose
- Python 3.11
- Node.js 18+

---

## Контакты и поддержка

Проект разработан как дипломная работа для системы управления арендой недвижимости.

Все критические функции реализованы и протестированы.
