# Install system-level managed-settings.json to ENABLE telemetry for ALL Claude
# Code (CLI + VS Code extension + WSL) WITHOUT a plugin and WITHOUT leaving any
# file inside the user's project or ~/.claude.
#
# This script is self-contained: the managed-settings JSON is embedded below, so
# it is the ONLY file you need to deploy.
#
# Install (writes C:\Program Files\ClaudeCode\managed-settings.json, self-elevates):
#   right-click > "Run with PowerShell", OR:
#   powershell -ExecutionPolicy Bypass -File install-managed-settings.ps1
#
# Dump only (for GPO/Intune/imaging - writes managed-settings.json next to this
# script without installing or needing admin):
#   powershell -ExecutionPolicy Bypass -File install-managed-settings.ps1 -DumpJson
#
# Uninstall: delete C:\Program Files\ClaudeCode\managed-settings.json, then restart Claude Code.

param(
  [switch]$DumpJson,
  [switch]$NoBrowser   # skip auto-opening the dashboard in the browser after install
)

$ErrorActionPreference = "Stop"

# --- OTel telemetry endpoint (company LAN via nip.io) ---
# Telemetry goes over the company LAN (nip.io -> the dashboard server's LAN IP).
# This is fast AND does NOT consume the ngrok request quota. ngrok is used ONLY
# for viewing the dashboard in a browser, never for telemetry -- so every machine
# sending telemetry must be on the company LAN.
# 2026-07-06: company LAN IP = 192.168.1.92 (was .93; changed on WiFi reconnect).
# If the server's LAN IP changes again, update it here (set a static IP /
# DHCP reservation to avoid this breaking).
$ENDPOINT = "http://192.168.1.92.nip.io:4000/api/otel/logs"
$METRICS_ENDPOINT = $ENDPOINT -replace '/logs$', '/metrics'  # lines-of-code, acceptance, etc.

# --- ngrok public URL (for VIEWING the dashboard in a browser) ---
# Static ngrok domain -> localhost:4000 on the dashboard server. Opened
# automatically at the end of install (pass -NoBrowser to skip). Update this if
# the ngrok domain changes.
$DASHBOARD_URL = "https://patriot-tinwork-scabby.ngrok-free.dev"

# --- Single source of truth for the managed-settings.json content ---
$json = @"
{
  "wslInheritsWindowsSettings": true,
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_LOG_USER_PROMPTS": "0",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT": "$ENDPOINT",
    "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT": "$METRICS_ENDPOINT",
    "OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE": "delta"
  }
}
"@

# --- Dump mode: just write the raw JSON beside this script, for mass deployment ---
if ($DumpJson) {
  $out = Join-Path $PSScriptRoot "managed-settings.json"
  $json | Set-Content -Path $out -Encoding utf8
  Write-Host "OK. Wrote raw JSON for GPO/Intune/imaging: $out" -ForegroundColor Green
  Write-Host "Push it to C:\Program Files\ClaudeCode\managed-settings.json on target machines."
  exit
}

# --- Self-elevate to admin if not already ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "Administrator rights required - relaunching elevated..." -ForegroundColor Yellow
  try {
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  } catch {
    Write-Host "Could not elevate (UAC declined or no admin rights)." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkGray
    Write-Host "Fix: right-click the file > 'Run as administrator', or run in an admin PowerShell:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -ForegroundColor Yellow
    Read-Host "Press Enter to close"
  }
  exit
}

$dir = "C:\Program Files\ClaudeCode"
$path = Join-Path $dir "managed-settings.json"

try {
  New-Item -ItemType Directory -Force $dir | Out-Null
  $json | Set-Content -Path $path -Encoding utf8
} catch {
  Write-Host ""
  Write-Host "ERROR writing settings file:" -ForegroundColor Red
  Write-Host "  $path" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor DarkGray
  Read-Host "Press Enter to close"
  exit 1
}

Write-Host ""
Write-Host "OK. Wrote: $path" -ForegroundColor Green
Write-Host "Endpoint: $ENDPOINT"
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "  1. Make sure the dashboard server is running (npm run dev in a separate terminal)."
Write-Host "  2. FULLY quit Claude Code / VS Code (not just Reload Window), then reopen."
Write-Host "  3. Chat a few messages."
Write-Host "  4. View the dashboard: $DASHBOARD_URL  (/live page - your session appears in ~30-60s)."
Write-Host ""
Write-Host "Tip: telemetry is attributed by your Claude account email (matched by the part before @)." -ForegroundColor DarkGray

# --- Open the dashboard in the user's default browser (skippable with -NoBrowser) ---
if (-not $NoBrowser) {
  Write-Host ""
  Write-Host "Opening the dashboard in your browser: $DASHBOARD_URL" -ForegroundColor Cyan
  Write-Host "(ngrok may show a warning page - click 'Visit Site' once, then log in with your company account.)" -ForegroundColor DarkGray
  try {
    # Launch via explorer.exe so the browser opens as the logged-in USER (medium
    # integrity), not elevated - avoids browsers refusing to run as admin.
    Start-Process explorer.exe $DASHBOARD_URL
  } catch {
    Write-Host "Could not open the browser automatically. Open manually: $DASHBOARD_URL" -ForegroundColor Yellow
  }
}

Read-Host "Press Enter to close"
