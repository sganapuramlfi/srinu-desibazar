# Start DesiBazaar Server
Write-Host "Starting DesiBazaar Server..." -ForegroundColor Green

Set-Location "server"

$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:9100/desibazaar"
$env:NODE_ENV = "development"
$env:SESSION_SECRET = "your_strong_session_secret"
$env:OLLAMA_URL = "http://localhost:11435"
$env:PORT = "3000"

Write-Host "Environment variables set" -ForegroundColor Yellow
Write-Host "Database URL: $env:DATABASE_URL" -ForegroundColor Cyan

npm run dev