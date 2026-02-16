# Cartographix

Open-source web app that transforms any city into a stylized map poster.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- GDAL (`brew install gdal` on macOS)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

Runs on http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173 (proxies `/api` to backend)

### Or use the scripts

```bash
./run-backend.sh   # Terminal 1
./run-frontend.sh  # Terminal 2
```

## Testing

1. Open http://localhost:5173
2. Type a city name (autocomplete will suggest matches)
3. Select a theme and adjust the distance slider
4. Click **Generate poster**
5. The poster renders in ~30-120s and displays in the browser
6. Optionally enter an email to receive a copy (requires `RESEND_API_KEY`)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | No | Resend API key for email delivery |
| `ENVIRONMENT` | No | `development` or `production` |
| `PORT` | No | Server port (default: 8000) |

## Docker

```bash
docker compose up --build
```

Builds frontend, installs geospatial deps, serves everything on port 8000.

## Stack

React + Vite + TypeScript · FastAPI · OSMnx + matplotlib · Resend · Docker

## License

MIT
