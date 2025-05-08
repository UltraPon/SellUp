FROM python:3.11
WORKDIR /app

# Установка зависимостей
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Копирование проекта
COPY . .

# Переменные окружения
ENV PYTHONPATH=/app
ENV DJANGO_SETTINGS_MODULE=SellUp.settings

# Проверка структуры (для дебага)
RUN ls -la && echo "=== Files in /app ==="

# Команда запуска
CMD ["sh", "-c", "python manage.py migrate && gunicorn SellUp.wsgi:application --bind 0.0.0.0:$PORT"]