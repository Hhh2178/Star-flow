$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$appWebDir = Join-Path $root "app\data\web"
$webDir = Join-Path $root "web"
$creatorDistDir = Join-Path $webDir "dist\creator"
$adminDistDir = Join-Path $webDir "dist\admin"

if (-not (Test-Path $webDir)) {
  throw "Missing web directory: $webDir"
}

if (-not (Test-Path (Join-Path $webDir "package.json"))) {
  throw "Missing web package.json in: $webDir"
}

Push-Location $webDir
try {
  yarn build-only
  if ($LASTEXITCODE -ne 0) { throw "Web build failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

if (-not (Test-Path $creatorDistDir)) {
  throw "Creator dist was not created: $creatorDistDir"
}
if (-not (Test-Path $adminDistDir)) {
  throw "Admin dist was not created: $adminDistDir"
}

node (Join-Path $PSScriptRoot "release-layout.mjs") $creatorDistDir $adminDistDir $appWebDir
if ($LASTEXITCODE -ne 0) { throw "Web release copy failed with exit code $LASTEXITCODE" }

Write-Output "Copied Creator to $appWebDir and Admin to $appWebDir\admin"
