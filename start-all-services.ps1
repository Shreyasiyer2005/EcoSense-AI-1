#!/usr/bin/env pwsh
# EcoSense AI - Start All Services
# This script starts the ML Service, Backend, and Frontend in the correct order

Write-Host "🚀 EcoSense AI - Starting All Services" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

# Stop any existing processes
Write-Host "🛑 Stopping existing services..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*main.py*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 1. Start Python ML Service
Write-Host ""
Write-Host "1️⃣  Starting Python ML Service (Port 8000)..." -ForegroundColor Cyan
Set-Location "ml-service"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "python main.py" -WindowStyle Normal
Set-Location ".."
Start-Sleep -Seconds 5

# Verify ML Service
Write-Host "   Checking ML Service health..." -ForegroundColor Gray
try {
    $mlHealth = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 5
    if ($mlHealth.status -eq "ok") {
        Write-Host "   ✅ ML Service is healthy" -ForegroundColor Green
        Write-Host "   📊 Python version: $($mlHealth.python_version)" -ForegroundColor Gray
        Write-Host "   🔧 NDVI capability: $($mlHealth.capabilities.ndvi_calculation)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  ML Service health check failed. Proceeding anyway..." -ForegroundColor Yellow
}

# 2. Start Node.js Backend
Write-Host ""
Write-Host "2️⃣  Starting Node.js Backend (Port 5000)..." -ForegroundColor Cyan
Set-Location "backend"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Normal
Set-Location ".."
Start-Sleep -Seconds 5

# Verify Backend
Write-Host "   Checking Backend health..." -ForegroundColor Gray
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 5
    if ($backendHealth.status -eq "ok") {
        Write-Host "   ✅ Backend is healthy" -ForegroundColor Green
        Write-Host "   🔗 ML Service URL: $($backendHealth.services.mlService)" -ForegroundColor Gray
        Write-Host "   🛰️  Satellite: $($backendHealth.services.satelliteProvider)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Backend health check failed. Proceeding anyway..." -ForegroundColor Yellow
}

# 3. Start React Frontend
Write-Host ""
Write-Host "3️⃣  Starting React Frontend (Port 3000)..." -ForegroundColor Cyan
Set-Location "frontend"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev -- --port 3000" -WindowStyle Normal
Set-Location ".."
Start-Sleep -Seconds 3

# Summary
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "✅ All Services Started!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Service URLs:" -ForegroundColor Cyan
Write-Host "   ML Service:  http://127.0.0.1:8000/health" -ForegroundColor White
Write-Host "   Backend API: http://localhost:5000/health" -ForegroundColor White
Write-Host "   Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "📝 Press any key to close this window (services will continue running)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
