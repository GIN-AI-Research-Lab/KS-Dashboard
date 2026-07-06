# Registers the KS-Dashboard keep-alive watchdog to run automatically at every
# logon (Task Scheduler), and starts it immediately. No admin required -- it's a
# per-user logon task.
#
# RUN THIS ONCE:
#   powershell -ExecutionPolicy Bypass -File deploy\register-keepalive.ps1
#
# It sets up: PostgreSQL + dev server (port 4000) + ngrok tunnel to auto-start and
# auto-restart if any of them dies, so the public ngrok URL never goes dark.
#
# UNDO (stop auto-start):
#   Unregister-ScheduledTask -TaskName "KS-Dashboard-KeepAlive" -Confirm:$false
#   Get-Process ngrok,node | Stop-Process -Force   # (optional) stop what's running

$ErrorActionPreference = "Stop"

$script   = Join-Path $PSScriptRoot "keepalive.ps1"
$taskName = "KS-Dashboard-KeepAlive"

if (-not (Test-Path $script)) { throw "keepalive.ps1 not found next to this script: $script" }

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
  -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "OK: scheduled task '$taskName' registered (runs at every logon)." -ForegroundColor Green

# Start it now so protection is active immediately (the watchdog's mutex prevents duplicates).
Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile","-WindowStyle","Hidden","-ExecutionPolicy","Bypass","-File",$script `
  -WindowStyle Hidden
Write-Host "OK: watchdog started now." -ForegroundColor Green
Write-Host ""
Write-Host "Log: $env:LOCALAPPDATA\ks-dashboard-keepalive\keepalive.log"
Write-Host "It keeps alive: PostgreSQL (5433) + dev server (4000) + ngrok tunnel."
