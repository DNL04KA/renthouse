# 🌍 Обновления: Мультивалютность и Карта

**Дата:** 6 мая 2026 г.
**Статус:** ✅ ПОЛНОСТЬЮ РЕАЛИЗОВАНО

---

## 📍 Что добавлено

### 1. **Система мультивалютности**

#### Backend (все в `src/models/all_models.py`):
- ✅ Новый Enum `Currency` с поддержкой:
  - 🇧🇾 **BYN** (Белорусский рубль) - базовая валюта
  - 🇺🇸 **USD** (Доллар США)
  - 🇪🇺 **EUR** (Евро)
  - 🇷🇺 **RUB** (Российский рубль)

- ✅ Поле `currency: Currency = Currency.byn` добавлено в:
  - `Property` (для всех объектов)
  - `LeaseContract` (для договоров)
  - `Payment` (для платежей)

#### API Endpoints (новый роутер `currency_router`):
```python
GET /api/v1/currencies/rates              # Получить текущие курсы
GET /api/v1/currencies/supported          # Поддерживаемые валюты
POST /api/v1/currencies/convert           # Конвертировать сумму
POST /api/v1/currencies/rates/update      # Обновить курсы (admin)
```

#### Сервис валют (`src/services/currency_service.py`):
- 📊 Управление курсами обмена
- 🔄 Конвертация между любыми валютами через BYN
- 🌐 Интеграция с API НБ РБ для актуальных курсов
- 🔒 Admin-only функция обновления курсов

### 2. **Карта на Leaflet** 

#### Frontend (компонента уже существовала):
- ✅ `PropertyMap.tsx` - интерактивная карта с маркерами
  - Поддержка нескольких объектов на одной карте
  - Цветные маркеры (аренда/продажа)
  - Всплывающие окна с информацией
  - Автоматическое масштабирование

#### Интеграция:
- ✅ Карта в `PublicPropertyDetails.tsx` (детали объекта)
- ✅ Карта в `Catalog.tsx` (переключаемый режим список/карта)
- ✅ Маркеры с информацией о цене и городе

### 3. **Выбор валюты на Frontend**

#### Catalog.tsx:
- 📱 Выбор валюты в фильтрах (Select с флагами)
- 💱 Все цены пересчитываются в реальном времени
- 🔢 Курсы: USD (0.32), EUR (0.34), RUB (30)

#### PublicPropertyDetails.tsx:
- 🌐 Select для выбора валюты
- 💰 Отображение цены в выбранной валюте
- 🔄 Конвертация автоматическая

#### Catalog.tsx - Карта:
- 💱 PropertyMap отображает цены в выбранной валюте

---

## 🗄️ Изменения в БД

### Новая миграция Alembic:
```bash
alembic/versions/7b20d7e90bf0_add_currency_support.py
```

Миграция добавляет:
- `currency` column в таблицу `properties` (тип: Enum, default: 'BYN')
- `currency` column в таблицу `lease_contracts`
- `currency` column в таблицу `payments`

---

## 📡 API Примеры

### Получить курсы валют:
```bash
curl http://localhost:8000/api/v1/currencies/rates
# Response:
# { "rates": { "BYN": 1.0, "USD": 0.32, "EUR": 0.34, "RUB": 30.0 } }
```

### Конвертировать 100 BYN в USD:
```bash
curl "http://localhost:8000/api/v1/currencies/convert?amount=100&from_currency=BYN&to_currency=USD"
# Response:
# { "amount": 100, "from": "BYN", "to": "USD", "result": 32.0 }
```

### Обновить курсы (admin):
```bash
curl -X POST http://localhost:8000/api/v1/currencies/rates/update \
  -H "Authorization: Bearer <token>"
# Получает курсы с API НБ РБ
```

---

## 🎨 UI Улучшения

### Catalog:
```
📍 Новый Select для валюты в фильтрах
   🇧🇾 BYN (Белорусский рубль)
   🇺🇸 USD (Доллар США)
   🇪🇺 EUR (Евро)
   🇷🇺 RUB (Российский рубль)

💱 Все цены обновляются при смене валюты

🗺️ Переключение между режимами:
   📋 Список
   🗺️ Карта (с маркерами и ценами в выбранной валюте)
```

### PublicPropertyDetails:
```
📍 Карта объекта (если указаны координаты)
   ↳ Маркер с адресом и городом
   ↳ Масштабируемая и перетаскиваемая

💱 Select для выбора валюты
   ↳ Цена автоматически пересчитывается
   ↳ Модальное окно контактов показывает цену в выбранной валюте
```

---

## 🔧 Технические детали

### Backend:
- ✅ Алхимия с SQLAlchemy для работы с Enum
- ✅ Async сервис для конвертации валют
- ✅ NBRB API интеграция для реальных курсов
- ✅ Кэширование курсов в памяти

### Frontend:
- ✅ React hooks для управления состоянием валюты
- ✅ Реактивная конвертация при смене валюты
- ✅ Leaflet + react-leaflet для карт
- ✅ Ant Design Select с кастомными иконками

### Миграция БД:
- ✅ Автоматическая генерация через Alembic
- ✅ Добавление новых полей с default значениями
- ✅ Обратная совместимость

---

## 📋 Список файлов изменен

### Backend:
- ✅ `src/models/all_models.py` - добавлен Currency Enum
- ✅ `src/schemas/all_schemas.py` - обновлены все schemas
- ✅ `src/api/v1/endpoints.py` - добавлен currency_router
- ✅ `src/services/currency_service.py` - новый сервис валют
- ✅ `src/main.py` - подключен currency_router
- ✅ `requirements.txt` - добавлен httpx для API
- ✅ `alembic/versions/7b20d7e90bf0_*.py` - миграция БД

### Frontend:
- ✅ `src/components/PropertyMap.tsx` - отображение валюты
- ✅ `src/pages/Catalog.tsx` - выбор валюты и конвертация
- ✅ `src/pages/PublicPropertyDetails.tsx` - карта и выбор валюты

---

## ✅ Проверка полноты

- [x] Поддержка 4 валют (BYN, USD, EUR, RUB)
- [x] Конвертация между валютами
- [x] Выбор валюты в каталоге
- [x] Выбор валюты в деталях объекта
- [x] Карта на Leaflet в деталях
- [x] Карта с маркерами в каталоге
- [x] API для курсов валют
- [x] Admin функция обновления курсов
- [x] Миграция БД для нового поля currency
- [x] Все цены отображаются в выбранной валюте

---

## 🚀 Запуск после обновлений

```bash
# 1. Установить новые зависимости
cd backend && source venv/bin/activate
pip install httpx

# 2. Запустить миграцию
alembic upgrade head

# 3. Запустить backend
uvicorn src.main:app --reload

# 4. Запустить frontend (отдельный терминал)
cd frontend && npm run dev
```

---

## 🎯 Результат

✨ **Система полностью поддерживает мультивалютность:**
- Пользователи могут выбирать валюту просмотра
- Все цены автоматически пересчитываются
- Карта показывает местоположение объектов
- API предоставляет актуальные курсы валют
- Admin может обновлять курсы через API

**Готово к использованию! 🎉**
