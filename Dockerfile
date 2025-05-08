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

# Copy only necessary files
COPY SellUp/ ./SellUp/
COPY listings/ ./listings/
COPY manage.py .

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=SellUp.settings

# Collect static files (skip if jazzmin is not properly installed)
RUN if [ -f "/opt/venv/lib/python3.11/site-packages/jazzmin/__init__.py" ]; then \
        python manage.py collectstatic --noinput; \
    else \
        echo "Skipping collectstatic (jazzmin not installed)"; \
    fi

# Expose port
EXPOSE 8000

# Run Gunicorn
CMD ["gunicorn", "SellUp.wsgi:application", "--bind", "0.0.0.0:8000"]