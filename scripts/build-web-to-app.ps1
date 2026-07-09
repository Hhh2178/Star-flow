$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$appWebDir = Join-Path $root "app\data\web"
$webDir = Join-Path $root "web"
$distDir = Join-Path $webDir "dist"

if (-not (Test-Path $webDir)) {
  throw "Missing web directory: $webDir"
}

if (-not (Test-Path (Join-Path $webDir "package.json"))) {
  throw "Missing web package.json in: $webDir"
}

Push-Location $webDir
try {
  yarn build-only
} finally {
  Pop-Location
}

if (-not (Test-Path $distDir)) {
  throw "Web dist was not created: $distDir"
}

New-Item -ItemType Directory -Force $appWebDir | Out-Null
Copy-Item -Path (Join-Path $distDir "*") -Destination $appWebDir -Recurse -Force

Write-Output "Copied web dist to $appWebDir"
