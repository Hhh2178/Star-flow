$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $root "app"
$webDir = Join-Path $root "web"
$logsDir = Join-Path $root "logs"

New-Item -ItemType Directory -Force $logsDir | Out-Null

if (-not (Test-Path $appDir)) {
  throw "Missing app directory: $appDir"
}

if (-not (Test-Path $webDir)) {
  throw "Missing web directory: $webDir"
}

$appPort = 10588
$webPort = 50188

$appListening = Get-NetTCPConnection -LocalPort $appPort -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

if (-not $appListening) {
  $appOut = Join-Path $logsDir "toonflow-app-local.log"
  $appErr = Join-Path $logsDir "toonflow-app-local.err.log"
  Start-Process powershell -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "cd '$appDir'; yarn start"
  ) -RedirectStandardOutput $appOut -RedirectStandardError $appErr -WindowStyle Hidden | Out-Null
}

$webListening = Get-NetTCPConnection -LocalPort $webPort -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

if (-not $webListening) {
  $webOut = Join-Path $logsDir "toonflow-web-dev.log"
  $webErr = Join-Path $logsDir "toonflow-web-dev.err.log"
  Start-Process powershell -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "cd '$webDir'; yarn dev"
  ) -RedirectStandardOutput $webOut -RedirectStandardError $webErr -WindowStyle Hidden | Out-Null
}

Write-Output "App backend: http://localhost:$appPort"
Write-Output "Web dev:     http://localhost:$webPort"
Write-Output "Logs:        $logsDir"
