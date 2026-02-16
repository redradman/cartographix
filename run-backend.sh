#!/bin/bash
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "Starting backend on http://localhost:8000"
python -m app.main
