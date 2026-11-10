#!/usr/bin/env pwsh
# EcoSense AI - Stop All Services

Write-Host "🛑 Stopping EcoSense AI Services..." -ForegroundColor Yellow

# Stop Node.js processes
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   Stopping Node.js processes..." -ForegroundColor Gray
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Node.js processes stopped" -ForegroundColor Green
}

# Stop Python processes running main.py
$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*main.py*" }
if ($pythonProcesses) {
    Write-Host "   Stopping Python ML Service..." -ForegroundColor Gray
    $pythonProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Python ML Service stopped" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ All services stopped" -ForegroundColor Green
