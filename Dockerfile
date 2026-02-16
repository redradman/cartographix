# Stage 1 - Build frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2 - Runtime
FROM python:3.11.11-slim

# Install runtime deps (kept) and build deps (removed after pip install)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gdal-bin libgdal-dev \
        g++ build-essential libffi-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (cached unless requirements.txt changes)
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y --auto-remove g++ build-essential libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy application code
COPY backend/ .

# Copy frontend build
COPY --from=build-frontend /app/frontend/dist /frontend/dist

ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
