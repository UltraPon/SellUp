FROM python:3.11
WORKDIR /app

# Установка зависимостей с явным указанием PEP 517
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-warn-script-location -r requirements.txt

# Копирование проекта
COPY . .

# Проверка структуры (для отладки)
RUN echo "=== File structure ===" && ls -la && \
    echo "=== Python paths ===" && python -c "import sys; print(sys.path)"

# Команда запуска (явный путь к gunicorn)
CMD ["/usr/local/bin/gunicorn", "SellUp.wsgi:application", "--bind", "0.0.0.0:$PORT"]