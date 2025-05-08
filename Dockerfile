FROM python:3.11

WORKDIR /app

# Устанавливаем системные зависимости для psycopg2 и других пакетов
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Копируем зависимости первыми для кэширования
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем весь проект
COPY . .

# Настройки окружения
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=SellUp.settings

# Собираем статику
RUN python manage.py collectstatic --noinput

EXPOSE $PORT

CMD ["gunicorn", "SellUp.wsgi:application", "--bind", "0.0.0.0:$PORT"]