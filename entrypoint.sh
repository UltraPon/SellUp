#!/bin/sh

# Активируем виртуальное окружение
. /opt/venv/bin/activate

# Проверяем доступность PostgreSQL (используем встроенный Python вместо netcat)
echo "Waiting for PostgreSQL to start..."
while ! python -c "import socket; import os; socket.create_connection((os.getenv('DATABASE_HOST'), int(os.getenv('DATABASE_PORT', 5432))), timeout=1)"; do
  sleep 1
done
echo "PostgreSQL started"

# Выполняем миграции
echo "Running migrations..."
python manage.py migrate --noinput

# Собираем статику
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Запускаем Gunicorn
echo "Starting Gunicorn..."
exec gunicorn SellUp.wsgi:application --bind 0.0.0.0:$PORT