<#
.SYNOPSIS
  clean.ps1 - Clean Modulon workspace artifacts (deps + build outputs) with progress.

.DESCRIPTION
  Repo layout:
    - apps/:              Next.js (web) + NestJS (api)
    - packages/:          shared workspaces (database, schemas, config, etc.)
    - this script:        scripts/clean.ps1

  What it removes:
    - Build outputs:      .turbo, **/.next, **/dist, **/coverage , **/generated, **/*.tsbuildinfo
    - Dependencies:       node_modules (root + nested in apps/ and packages/)

  Switches:
    -Build               Remove build artifacts (.turbo, .next, dist, coverage, generated, tsbuildinfo)
    -Deps                Remove dependencies (node_modules)
    -Build -Deps          Remove both (recommended for full cleanup)

  Notes:
    - Uses Windows-native fast delete: cmd /c rd /s /q
    - Shows progress (folder-by-folder) in the console.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/clean.ps1 -Build

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/clean.ps1 -Deps

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/clean.ps1 -Build -Deps
#>


param(
  [switch]$Deps,
  [switch]$Build
)

$ErrorActionPreference = "Stop"

function Remove-Dir([string]$path) {
  if (-not (Test-Path -LiteralPath $path -PathType Container)) { return }
  cmd /c "rd /s /q `"$path`""
}

function Remove-File([string]$path) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return }
  Remove-Item -LiteralPath $path -Force
}

$targets = @()

if ($Build) {
  if (Test-Path ".turbo") { $targets += (Resolve-Path ".turbo").Path }

  # Build artifact directories
  $targets += Get-ChildItem -Path "apps", "packages" -Directory -Recurse -Force |
  Where-Object { $_.Name -in @(".next", "dist", "coverage", "generated", ".turbo") } |
  ForEach-Object { $_.FullName }

  # TypeScript incremental cache files (*.tsbuildinfo)
  $targets += Get-ChildItem -Path "apps", "packages" -File -Recurse -Force -Filter "*.tsbuildinfo" |
  ForEach-Object { $_.FullName }
}

if ($Deps) {
  if (Test-Path "node_modules") { $targets += (Resolve-Path "node_modules").Path }

  $targets += Get-ChildItem -Path "apps", "packages" -Directory -Recurse -Force |
  Where-Object { $_.Name -eq "node_modules" } |
  ForEach-Object { $_.FullName }
}

$targets = $targets | Sort-Object -Unique

if ($targets.Count -eq 0) {
  Write-Host "Nothing to remove."
  exit 0
}

$total = $targets.Count
for ($i = 0; $i -lt $total; $i++) {
  $p = $targets[$i]
  $pct = [int]((($i + 1) / $total) * 100)

  Write-Host ("[{0}/{1}] Removing: {2}" -f ($i + 1), $total, $p)
  Write-Progress -Activity "Cleaning" -Status $p -PercentComplete $pct

  if (Test-Path -LiteralPath $p -PathType Container) {
    Remove-Dir $p
  }
  elseif (Test-Path -LiteralPath $p -PathType Leaf) {
    Remove-File $p
  }
}

Write-Progress -Activity "Cleaning" -Completed
Write-Host ("Done. Removed {0} path(s)." -f $total)