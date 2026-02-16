# Stage 1 - Build frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2 - Runtime
FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gdal-bin libgdal-dev g++ build-essential libffi-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

COPY --from=build-frontend /app/frontend/dist /frontend/dist

ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
