@echo off
echo Starting DesiBazaar Server...
cd server
set DATABASE_URL=postgresql://postgres:postgres@localhost:9100/desibazaar
set NODE_ENV=development
set SESSION_SECRET=your_strong_session_secret
set OLLAMA_URL=http://localhost:11435
set PORT=3000
npm run dev