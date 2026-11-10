#!/usr/bin/env pwsh
# Quick service status checker

Write-Host ""
Write-Host "🔍 EcoSense AI - Service Status Check" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check ML Service (Port 8000)
Write-Host "🐍 Python ML Service (Port 8000):" -ForegroundColor Yellow
try {
    $mlHealth = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 3
    Write-Host "   ✅ RUNNING - $($mlHealth.service) v$($mlHealth.version)" -ForegroundColor Green
    Write-Host "   📊 Python: $($mlHealth.python_version) | NDVI: $($mlHealth.capabilities.ndvi_calculation)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ NOT RUNNING or UNREACHABLE" -ForegroundColor Red
    Write-Host "   💡 Start with: cd ml-service; python main.py" -ForegroundColor Yellow
}

Write-Host ""

# Check Backend (Port 5000)
Write-Host "🚀 Node.js Backend (Port 5000):" -ForegroundColor Yellow
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 3
    Write-Host "   ✅ RUNNING - $($backendHealth.service) v$($backendHealth.version)" -ForegroundColor Green
    Write-Host "   🔗 ML: $($backendHealth.services.mlService) | Satellite: $($backendHealth.services.satelliteProvider)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ NOT RUNNING or UNREACHABLE" -ForegroundColor Red
    Write-Host "   💡 Start with: cd backend; npm start" -ForegroundColor Yellow
}

Write-Host ""

# Check Frontend (Port 3000)
Write-Host "⚛️  React Frontend (Port 3000):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ RUNNING - HTTP $($response.StatusCode)" -ForegroundColor Green
        Write-Host "   🌐 Access at: http://localhost:3000" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ NOT RUNNING or UNREACHABLE" -ForegroundColor Red
    Write-Host "   💡 Start with: cd frontend; npm run dev -- --port 3000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan

# Count running services
$runningCount = 0
try { Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 1 -ErrorAction Stop; $runningCount++ } catch {}
try { Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 1 -ErrorAction Stop; $runningCount++ } catch {}
try { Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop; $runningCount++ } catch {}

Write-Host ""
if ($runningCount -eq 3) {
    Write-Host "✅ All services are running! Ready for NDVI analysis." -ForegroundColor Green
} elseif ($runningCount -eq 0) {
    Write-Host "❌ No services running. Start with: .\start-all-services.ps1" -ForegroundColor Red
} else {
    Write-Host "⚠️  $runningCount/3 services running. Check output above." -ForegroundColor Yellow
}
Write-Host ""
