"""
Сервис для работы с валютами и курсами обмена
"""

import httpx
from typing import Dict, Optional
from datetime import datetime, timedelta
from functools import lru_cache

# Курсы валют по отношению к BYN (примерные)
# В production используется API для актуальных курсов
DEFAULT_RATES: Dict[str, float] = {
    'BYN': 1.0,
    'USD': 0.32,
    'EUR': 0.34,
    'RUB': 30.0,
}

class CurrencyService:
    """Управление валютами и конвертацией"""
    
    def __init__(self):
        self.rates = DEFAULT_RATES.copy()
        self.last_update = datetime.now()
    
    def get_rates(self) -> Dict[str, float]:
        """Получить текущие курсы валют"""
        # В production: обновлять из API каждый час
        return self.rates.copy()
    
    def convert(
        self,
        amount: float,
        from_currency: str,
        to_currency: str,
    ) -> float:
        """
        Конвертировать сумму из одной валюты в другую
        
        Args:
            amount: Сумма для конвертации
            from_currency: Исходная валюта (код ISO 4217)
            to_currency: Целевая валюта (код ISO 4217)
        
        Returns:
            Сконвертированная сумма
        """
        if from_currency not in self.rates:
            raise ValueError(f"Неизвестная валюта: {from_currency}")
        if to_currency not in self.rates:
            raise ValueError(f"Неизвестная валюта: {to_currency}")
        
        # Конвертация через BYN (базовую валюту)
        amount_in_byn = amount / self.rates[from_currency]
        result = amount_in_byn * self.rates[to_currency]
        
        return round(result, 2)
    
    def set_rate(self, currency: str, rate: float) -> None:
        """Установить курс валюты относительно BYN"""
        if rate <= 0:
            raise ValueError("Курс должен быть положительным числом")
        self.rates[currency] = rate
        self.last_update = datetime.now()
    
    def get_supported_currencies(self) -> list[str]:
        """Получить список поддерживаемых валют"""
        return list(self.rates.keys())
    
    async def update_rates_from_api(self) -> Dict[str, float]:
        """
        Обновить курсы валют из внешнего API
        
        Использует NBRBdevelopers API для белорусских курсов
        """
        try:
            async with httpx.AsyncClient() as client:
                # API НБ РБ для курсов валют
                response = await client.get(
                    'https://www.nbrb.by/api/exrates/rates',
                    params={'periodicity': 0},
                    timeout=5.0
                )
                response.raise_for_status()
                data = response.json()
                
                # Парсим ответ
                rates_map = {item['Cur_Code']: item['Cur_OfficialRate'] for item in data}
                
                # Обновляем известные нам валюты
                if 'USD' in rates_map:
                    self.set_rate('USD', 1.0 / rates_map['USD'])
                if 'EUR' in rates_map:
                    self.set_rate('EUR', 1.0 / rates_map['EUR'])
                if 'RUB' in rates_map:
                    self.set_rate('RUB', rates_map['RUB'])  # RUB уже в нужном формате
                
                return self.get_rates()
        except Exception as e:
            print(f"Ошибка обновления курсов: {e}")
            return self.get_rates()


# Глобальный экземпляр
currency_service = CurrencyService()


def get_currency_service() -> CurrencyService:
    """Dependency injection для сервиса валют"""
    return currency_service
