FROM python:3.11
WORKDIR /app

# Копируем только requirements сначала
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Копируем ВЕСЬ проект
COPY . .

# Устанавливаем правильные пути
ENV PYTHONPATH=/app
ENV DJANGO_SETTINGS_MODULE=SellUp.settings

# Команда запуска
CMD ["sh", "-c", "python manage.py migrate && gunicorn SellUp.wsgi:application --bind 0.0.0.0:$PORT"]