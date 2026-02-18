# Stage 1a - Build email templates
FROM node:20-alpine AS build-emails
WORKDIR /app/emails
COPY emails/package.json emails/package-lock.json* ./
RUN npm ci
COPY emails/ .
RUN npm run build

# Stage 1b - Build frontend
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

# Copy font files
COPY backend/fonts/ fonts/

# Copy application code
COPY backend/ .

# Copy frontend build
COPY --from=build-frontend /app/frontend/dist /frontend/dist

# Copy pre-rendered email template
COPY --from=build-emails /app/emails/dist/poster-ready.html /app/emails/poster-ready.html

RUN useradd -r -s /bin/false appuser && mkdir -p /app/output && chown -R appuser:appuser /app

ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production

USER appuser

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
