#!/usr/bin/env pwsh
# Test ML Service Connection from Backend

Write-Host "🧪 Testing ML Service Connection" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: ML Service Health
Write-Host "1️⃣  Testing ML Service Health..." -ForegroundColor Yellow
try {
    $mlHealth = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 5
    Write-Host "   ✅ ML Service is reachable" -ForegroundColor Green
    Write-Host "   Status: $($mlHealth.status)" -ForegroundColor Gray
    Write-Host "   Service: $($mlHealth.service)" -ForegroundColor Gray
    Write-Host "   Version: $($mlHealth.version)" -ForegroundColor Gray
    Write-Host "   NDVI Capable: $($mlHealth.capabilities.ndvi_calculation)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ ML Service is NOT reachable" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Backend Health
Write-Host "2️⃣  Testing Backend Health..." -ForegroundColor Yellow
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 5
    Write-Host "   ✅ Backend is reachable" -ForegroundColor Green
    Write-Host "   Status: $($backendHealth.status)" -ForegroundColor Gray
    Write-Host "   ML Service URL: $($backendHealth.services.mlService)" -ForegroundColor Gray
    Write-Host "   Satellite Provider: $($backendHealth.services.satelliteProvider)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Backend is NOT reachable" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: ML Service Root Endpoint
Write-Host "3️⃣  Testing ML Service API..." -ForegroundColor Yellow
try {
    $mlRoot = Invoke-RestMethod -Uri "http://127.0.0.1:8000/" -TimeoutSec 5
    Write-Host "   ✅ ML Service API is working" -ForegroundColor Green
    Write-Host "   Service: $($mlRoot.service)" -ForegroundColor Gray
    Write-Host "   Status: $($mlRoot.status)" -ForegroundColor Gray
    Write-Host "   Endpoints:" -ForegroundColor Gray
    $mlRoot.endpoints.PSObject.Properties | ForEach-Object {
        Write-Host "     - $($_.Name): $($_.Value)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "   ❌ ML Service API failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ All connection tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run NDVI analysis from the frontend." -ForegroundColor Yellow
