#!/bin/sh

# Активируем виртуальное окружение
. /opt/venv/bin/activate

# Проверяем доступность PostgreSQL перед миграциями
echo "Waiting for PostgreSQL to start..."
while ! nc -z $DATABASE_HOST $DATABASE_PORT; do
  sleep 0.1
done
echo "PostgreSQL started"

# Выполняем миграции
echo "Running migrations..."
python /app/manage.py migrate --noinput

# Собираем статику
echo "Collecting static files..."
python /app/manage.py collectstatic --noinput

# Запускаем Gunicorn
echo "Starting Gunicorn..."
exec gunicorn --pythonpath /app SellUp.wsgi:application --bind 0.0.0.0:$PORT