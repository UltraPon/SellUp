FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --no-warn-script-location -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only necessary files (exclude frontend files)
COPY SellUp/ ./SellUp/
COPY listings/ ./listings/
COPY manage.py .

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=SellUp.settings

# Collect static files (if needed)
RUN python manage.py collectstatic --noinput

# Expose port (use default or from $PORT)
EXPOSE 8000

# Run Gunicorn
CMD ["gunicorn", "SellUp.wsgi:application", "--bind", "0.0.0.0:8000"]