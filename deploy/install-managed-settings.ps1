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
  [switch]$DumpJson
)

$ErrorActionPreference = "Stop"

# --- Change this endpoint for real deployment (stable domain/tunnel, not a LAN IP) ---
$ENDPOINT = "http://192.168.50.55.nip.io:4000/api/otel/logs"
$METRICS_ENDPOINT = $ENDPOINT -replace '/logs$', '/metrics'  # lines-of-code, acceptance, etc.

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
  Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

$dir = "C:\Program Files\ClaudeCode"
$path = Join-Path $dir "managed-settings.json"

New-Item -ItemType Directory -Force $dir | Out-Null
$json | Set-Content -Path $path -Encoding utf8

Write-Host ""
Write-Host "OK. Wrote: $path" -ForegroundColor Green
Write-Host "Endpoint: $ENDPOINT"
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "  1. Make sure the dashboard server is running (npm run dev in a separate terminal)."
Write-Host "  2. FULLY quit Claude Code / VS Code (not just Reload Window), then reopen."
Write-Host "  3. Chat a few messages."
Write-Host "  4. Open the dashboard /live page - your session should appear (~30-60s lag)."
Write-Host ""
Write-Host "Tip: telemetry is attributed by your Claude account email (matched by the part before @)." -ForegroundColor DarkGray
Read-Host "Press Enter to close"
