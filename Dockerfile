FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install CBC solver and build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    coinor-cbc \
    coinor-libcbc-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt requirements.txt
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt -r backend/requirements.txt

# Copy application source
COPY backend/ backend/
COPY src/ src/
COPY app/ app/
COPY data/ data/

EXPOSE 8000

# Run migrations and start FastAPI server
CMD python backend/run_migrations.py && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}
