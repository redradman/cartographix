#!/bin/bash
cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting frontend on http://localhost:5173"
npm run dev
