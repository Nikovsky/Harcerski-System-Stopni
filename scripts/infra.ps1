<#
.SYNOPSIS
  infra.ps1 - Manage the HSS Docker Compose stack (up/down/start/stop/status/is-running).

.DESCRIPTION
  Repo layout:
    - docker-compose.yml:  infra/docker/docker-compose.yml
    - this script:         scripts/infra.ps1

  Actions (short == long):
    -u  == --up          Pull images (if needed) + docker compose up -d
    -d  == --down        docker compose down -v (removes volumes)
    -a  == --start       docker compose start
    -t  == --stop        docker compose stop
    -s  == --status      docker compose ps
    -r  == --is-running  Print 'true' if stack fully running, else 'false'
    -h  == --help        Show help

  Defaults:
    - No args => --up
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) { Write-Host "[INFO ] $Message" -ForegroundColor Cyan }
function Write-Warn([string]$Message) { Write-Host "[WARN ] $Message" -ForegroundColor Yellow }
function Write-Err ([string]$Message) { Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Show-Usage {
  @"
HSS stack helper

Usage:
  infra -u | --up          Pull images (if needed) and start the stack (detached)
  infra -a | --start       Start existing containers
  infra -t | --stop        Stop containers
  infra -d | --down        Down + remove volumes (docker compose down -v)
  infra -s | --status      Show status
  infra -r | --is-running  Print: true/false (machine-readable)
  infra -h | --help        Show this help

Examples:
  ./scripts/infra.ps1 --is-running
  ./scripts/infra.ps1 --up
"@ | Write-Host
}

function Resolve-RepoRoot {
  $scriptsDir = Split-Path -Parent $PSCommandPath
  return (Resolve-Path (Join-Path $scriptsDir "..")).Path
}

function Resolve-ComposeDirectory {
  $repoRoot = Resolve-RepoRoot
  $composeDir = Join-Path $repoRoot "docker"

  if (-not (Test-Path $composeDir)) {
    throw "Compose directory not found: $composeDir"
  }

  $composeFile = Join-Path $composeDir "docker-compose.yml"
  if (-not (Test-Path $composeFile)) {
    throw "docker-compose.yml not found: $composeFile"
  }

  return $composeDir
}

function Test-DockerCliAvailable {
  try { & docker version *> $null; return $true } catch { return $false }
}

function Test-DockerEngineRunning {
  try { & docker info *> $null; return $true } catch { return $false }
}

function Test-DockerComposeAvailable {
  try { & docker compose version *> $null; return $true } catch { return $false }
}

function Invoke-Compose {
  param([Parameter(Mandatory = $true)][string[]]$Args)

  $composeDir = Resolve-ComposeDirectory
  Push-Location $composeDir
  try {
    & docker compose @Args
  }
  finally {
    Pop-Location
  }
}

function Show-StackStatus { Invoke-Compose -Args @("ps") }

function Get-ShellScriptFiles {
  $composeDir = Resolve-ComposeDirectory
  # Recurse because in practice scripts live in subfolders (entrypoints, init, etc.)
  $files = Get-ChildItem -Path $composeDir -Recurse -File -Filter "*.sh" -ErrorAction SilentlyContinue
  return @($files)
}

function Convert-FileToLfIfNeeded {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath
  )

  $bytes = [System.IO.File]::ReadAllBytes($FilePath)

  # Safety: if file contains many NUL bytes, it may be UTF-16 or not a normal text file.
  # We skip to avoid corrupting it.
  if ([System.Array]::IndexOf($bytes, [byte]0) -ge 0) {
    Write-Warn "Skipping (contains NUL bytes, looks like UTF-16/binary): $FilePath"
    return $false
  }

  # Quick scan for CRLF
  $hasCrLf = $false
  for ($i = 0; $i -lt $bytes.Length - 1; $i++) {
    if ($bytes[$i] -eq 13 -and $bytes[$i + 1] -eq 10) { $hasCrLf = $true; break }
  }

  if (-not $hasCrLf) { return $false }

  # Convert CRLF -> LF, and also drop any lone CR
  $out = New-Object System.Collections.Generic.List[byte]($bytes.Length)

  for ($i = 0; $i -lt $bytes.Length; $i++) {
    $b = $bytes[$i]

    if ($b -eq 13) {
      # If CRLF -> keep only LF (skip CR)
      if ($i -lt $bytes.Length - 1 -and $bytes[$i + 1] -eq 10) { continue }
      # Lone CR -> drop it
      continue
    }

    $out.Add($b)
  }

  [System.IO.File]::WriteAllBytes($FilePath, $out.ToArray())
  return $true
}

function Ensure-ShellScriptsLf {
  $files = Get-ShellScriptFiles
  if ($files.Count -eq 0) {
    Write-Info "No .sh files found under docker."
    return
  }

  $converted = 0
  foreach ($f in $files) {
    if (Convert-FileToLfIfNeeded -FilePath $f.FullName) {
      $converted++
      Write-Info "Converted to LF: $($f.FullName)"
    }
  }

  if ($converted -eq 0) {
    Write-Info "All .sh files are already LF ($($files.Count) checked)."
  }
  else {
    Write-Info "LF normalization done ($converted converted, $($files.Count) checked)."
  }
}

function Do-Up {
  Ensure-ShellScriptsLf
  Write-Info "Pulling images (if needed)..."
  Invoke-Compose -Args @("pull")

  Write-Info "Starting stack..."
  Invoke-Compose -Args @("up", "-d", "--remove-orphans")

  Write-Info "Stack status:"
  Show-StackStatus
}

function Do-Down {
  Write-Info "Stopping stack and removing volumes..."
  Invoke-Compose -Args @("down", "--remove-orphans", "--volumes")
  Write-Info "Done."
}

function Do-Start {
  Ensure-ShellScriptsLf
  Write-Info "Starting existing containers..."
  Invoke-Compose -Args @("start")
  Write-Info "Stack status:"
  Show-StackStatus
}

function Do-Stop {
  Write-Info "Stopping containers..."
  Invoke-Compose -Args @("stop")
  Write-Info "Stack status:"
  Show-StackStatus
}

function Get-ExpectedServices {
  $out = Invoke-Compose -Args @("config", "--services") 2>$null
  return @($out | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Get-RunningServices {
  $out = Invoke-Compose -Args @("ps", "--services", "--status", "running") 2>$null
  return @($out | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Do-IsRunning {
  # Machine-readable: prints only true/false.
  $expected = Get-ExpectedServices
  if ($expected.Count -eq 0) {
    Write-Output "false"
    exit 1
  }

  $running = Get-RunningServices

  $isFullyRunning = ($running.Count -ge $expected.Count)
  if ($isFullyRunning) {
    Write-Output "true"
    exit 0
  }

  Write-Output "false"
  exit 1
}

function Parse-Args {
  param([string[]]$RawArgs)

  $action = $null

  foreach ($arg in $RawArgs) {
    $a = $arg.Trim()
    if ($a -eq "") { continue }

    switch ($a) {
      "-h" { return @{ action = "help" } }
      "--help" { return @{ action = "help" } }

      "-u" { $action = "up"; continue }
      "--up" { $action = "up"; continue }

      "-d" { $action = "down"; continue }
      "--down" { $action = "down"; continue }

      "-a" { $action = "start"; continue }
      "--start" { $action = "start"; continue }

      "-t" { $action = "stop"; continue }
      "--stop" { $action = "stop"; continue }

      "-s" { $action = "status"; continue }
      "--status" { $action = "status"; continue }

      "-r" { $action = "is-running"; continue }
      "--is-running" { $action = "is-running"; continue }

      default { throw "Unknown argument: $a (use -h / --help)" }
    }
  }

  if (-not $action) { $action = "up" }
  return @{ action = $action }
}

# ---- Main ----

try {
  $parsed = Parse-Args -RawArgs $args

  if ($parsed.action -eq "help") {
    Show-Usage
    exit 0
  }

  if (-not (Test-DockerCliAvailable)) { Write-Err "Docker CLI not found."; exit 1 }
  if (-not (Test-DockerEngineRunning)) { Write-Err "Docker Engine is not running or not reachable."; exit 2 }
  if (-not (Test-DockerComposeAvailable)) { Write-Err "'docker compose' is not available."; exit 3 }

  switch ($parsed.action) {
    "up" { Do-Up; break }
    "down" { Do-Down; break }
    "start" { Do-Start; break }
    "stop" { Do-Stop; break }
    "status" { Show-StackStatus; break }
    "is-running" { Do-IsRunning; break }
    default { throw "Unsupported action: $($parsed.action)" }
  }

  exit 0
}
catch {
  # If you call --is-running, we want strict output, so do not print extra stuff here.
  if ($args -contains "--is-running" -or $args -contains "-r") {
    Write-Output "false"
    exit 1
  }

  Write-Err $_.Exception.Message
  Write-Warn "Tip: run './scripts/infra.ps1 -h'"
  exit 99
}
