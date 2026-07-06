# KS-Dashboard keep-alive watchdog.
#
# Keeps the three pieces the public dashboard needs alive, and restarts whichever
# one dies, so the ngrok URL never goes dark:
#   1. PostgreSQL  (Windows service "ks-postgres" on port 5433)
#   2. Dev server  (next dev -p 4000)
#   3. ngrok       (static domain tunnel -> localhost:4000)
#
# It is meant to be launched at logon by a Scheduled Task (see register-keepalive.ps1),
# and can also be run by hand. A single-instance mutex prevents duplicates.
#
# Stop it: end the "powershell" process running this file, or run
#   Get-ScheduledTask KS-Dashboard-KeepAlive | Disable-ScheduledTask
#
# NOTE: dev mode is intentional (this box is also the dev machine). To serve the
# production build instead, replace the `npm run dev` action with `npm run build`
# once + `npm run start`.

$ErrorActionPreference = "SilentlyContinue"

# --- single instance guard ---
$mutex = New-Object System.Threading.Mutex($false, "KS-Dashboard-KeepAlive")
if (-not $mutex.WaitOne(0)) { return }  # another copy already running

# --- config (machine-specific) ---
$Proj    = "f:\Project Ai\KS-Dashboard"
$Domain  = "patriot-tinwork-scabby.ngrok-free.dev"
$Ngrok   = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ngrok.exe"
# PostgreSQL 16 on this machine is a real Windows Service (StartType Automatic,
# name "ks-postgres") installed via winget -- not the portable pg_ctl binary
# some earlier machines used. The service manager starts/restarts it on its
# own, so this watchdog only needs to verify port 5433 is up, never call pg_ctl.
$LogDir  = "$env:LOCALAPPDATA\ks-dashboard-keepalive"
$WdLog   = "$LogDir\keepalive.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Log($m) {
  $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m
  Add-Content -Path $WdLog -Value $line
}
function PortUp([int]$p) { [bool](Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue) }
function ProcUp([string]$n) { [bool](Get-Process $n -ErrorAction SilentlyContinue) }

Log "keepalive started (pid $PID)"

while ($true) {
  try {
    # 1) PostgreSQL (Windows service "ks-postgres" -- Automatic start type already
    # restarts it on boot; only nudge it here if something stopped it mid-session)
    if (-not (PortUp 5433)) {
      Log "Postgres DOWN -> starting service"
      Start-Service -Name "ks-postgres" -ErrorAction SilentlyContinue
      Start-Sleep -Seconds 5
    }

    # 2) Dev server (only once the DB is up, or it'll crash on boot)
    if ((PortUp 5433) -and -not (PortUp 4000)) {
      Log "Dev server DOWN -> starting"
      Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory $Proj `
        -WindowStyle Hidden `
        -RedirectStandardOutput "$LogDir\dev.out.log" `
        -RedirectStandardError  "$LogDir\dev.err.log"
      Start-Sleep -Seconds 8
    }

    # 3) ngrok tunnel
    if (-not (ProcUp "ngrok")) {
      Log "ngrok DOWN -> starting"
      Start-Process -FilePath $Ngrok `
        -ArgumentList "http","--domain=$Domain","4000","--log","$LogDir\ngrok.log","--log-format","logfmt" `
        -WindowStyle Hidden
      Start-Sleep -Seconds 3
    }
  } catch {
    Log ("loop error: " + $_.Exception.Message)
  }

  Start-Sleep -Seconds 20
}
