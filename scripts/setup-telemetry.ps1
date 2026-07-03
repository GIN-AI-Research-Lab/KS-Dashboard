# KS Dashboard — one-time telemetry setup for a colleague's machine.
#
# Why this exists: Claude Code reports usage via its built-in OpenTelemetry
# export, which is configured through environment variables read at startup.
# Those live in ~/.claude/settings.json (user scope = applies to ALL projects,
# set once per machine). A plugin CANNOT carry these — plugin manifests only
# provide hooks/MCP servers, not host env vars — so this tiny script is the
# minimal, no-per-project way to point a machine at the dashboard.
#
# Usage (in PowerShell, once per machine):
#   powershell -ExecutionPolicy Bypass -File setup-telemetry.ps1
# Then fully restart VS Code (quit, not just Reload Window).

$ErrorActionPreference = "Stop"

# The dashboard's OTLP logs endpoint. Change this if the dashboard moves
# (new IP / a cloudflared tunnel / a real domain).
$ENDPOINT = "http://192.168.50.55.nip.io:4000/api/otel/logs"
$METRICS_ENDPOINT = $ENDPOINT -replace '/logs$', '/metrics'

$dir = Join-Path $HOME ".claude"
$path = Join-Path $dir "settings.json"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

# Load existing settings (or start fresh) and merge — never clobber other keys.
if (Test-Path $path) {
  $settings = Get-Content $path -Raw | ConvertFrom-Json
} else {
  $settings = [pscustomobject]@{}
}
if (-not $settings.PSObject.Properties.Match("env").Count) {
  $settings | Add-Member -NotePropertyName env -NotePropertyValue ([pscustomobject]@{}) -Force
}

$vars = @{
  "CLAUDE_CODE_ENABLE_TELEMETRY"                       = "1"
  "OTEL_LOG_USER_PROMPTS"                              = "0"
  "OTEL_LOGS_EXPORTER"                                 = "otlp"
  "OTEL_METRICS_EXPORTER"                              = "otlp"
  "OTEL_EXPORTER_OTLP_PROTOCOL"                        = "http/json"
  "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT"                   = $ENDPOINT
  "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"               = $METRICS_ENDPOINT
  "OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE" = "delta"
}
foreach ($k in $vars.Keys) {
  $settings.env | Add-Member -NotePropertyName $k -NotePropertyValue $vars[$k] -Force
}

$settings | ConvertTo-Json -Depth 20 | Set-Content $path -Encoding utf8

Write-Host "Done. Wrote telemetry env to $path" -ForegroundColor Green
Write-Host "Endpoint: $ENDPOINT"
Write-Host "Now FULLY restart VS Code (quit + reopen), then chat once." -ForegroundColor Yellow
