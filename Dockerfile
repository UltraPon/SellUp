FROM python:3.11
WORKDIR /app

# Установка зависимостей
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Копирование всего проекта
COPY . .

# Миграции и запуск
CMD ["sh", "-c", "python manage.py migrate && gunicorn SellUp.wsgi:application --bind 0.0.0.0:$PORT"]