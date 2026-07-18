$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $root "app"
$webDir = Join-Path $root "web"

foreach ($requiredFile in @(
  (Join-Path $appDir "package.json"),
  (Join-Path $webDir "package.json")
)) {
  if (-not (Test-Path $requiredFile)) {
    throw "Monorepo source is incomplete: $requiredFile is missing."
  }
}

& (Join-Path $PSScriptRoot "build-web-to-app.ps1")

Push-Location $appDir
try {
  yarn build
  if ($LASTEXITCODE -ne 0) { throw "App build failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

Write-Output "Stars Flow release build completed."
Write-Output "Creator/Admin web output: $appDir\data\web"
Write-Output "App output: $appDir\build"
