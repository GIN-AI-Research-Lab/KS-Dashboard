import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { readFile } from "node:fs/promises";
import path from "node:path";

// The public base URL to point telemetry at = the SAME origin the admin is
// currently viewing the dashboard from (ngrok domain today, a real domain later).
// Derived from the request so a colleague on ANY network/machine gets a reachable
// endpoint -- never a hardcoded LAN IP (which only works inside the office LAN).
function publicBaseUrl(req: NextRequest): string {
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = xfHost || req.headers.get("host") || req.nextUrl.host;
  const proto = xfProto || req.nextUrl.protocol.replace(/:$/, "");
  return `${proto}://${host}`;
}

// setup-telemetry.ps1 is generated on the fly with the endpoint baked in, so it
// always matches wherever this dashboard is reachable.
function renderSetupTelemetry(base: string): string {
  const endpoint = `${base}/api/otel/logs`;
  return `# KS Dashboard -- one-time telemetry setup for a colleague's machine.
#
# Claude Code reports usage via its built-in OpenTelemetry export, configured
# through env vars in ~/.claude/settings.json (user scope = all projects, once
# per machine). This script points THIS machine at the dashboard.
#
# The endpoint below was generated from the dashboard URL you downloaded this
# from, so it works from any machine that can reach that URL (no LAN required).
#
# Usage (PowerShell, once per machine):
#   powershell -ExecutionPolicy Bypass -File setup-telemetry.ps1
# Then FULLY restart VS Code / Claude Code (quit, not just Reload Window).

$ErrorActionPreference = "Stop"

try {
  $ENDPOINT = "${endpoint}"
  $METRICS_ENDPOINT = $ENDPOINT -replace '/logs$', '/metrics'

  $dir = Join-Path $HOME ".claude"
  $path = Join-Path $dir "settings.json"
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

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

  Write-Host ""
  Write-Host "OK. Telemetry env written to: $path" -ForegroundColor Green
  Write-Host "Endpoint: $ENDPOINT"
  Write-Host ""
  Write-Host "NEXT: fully quit VS Code / Claude Code (not just Reload Window), reopen, then chat once." -ForegroundColor Yellow
} catch {
  Write-Host ""
  Write-Host "FAILED to set up telemetry:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor DarkGray
}

# Keep the window open so you can read the result (the window would otherwise
# close instantly when run by double-click / right-click > Run with PowerShell).
Read-Host "Press Enter to close"
`;
}

// Files served from disk. Their hardcoded endpoint/URL lines are rewritten to the
// current public base URL at download time (see rewriteEndpoints).
const STATIC_FILES: Record<string, string> = {
  "install-managed-settings.ps1": "deploy/install-managed-settings.ps1",
};

function rewriteEndpoints(content: string, base: string): string {
  return content
    .replace(/^\$ENDPOINT = "[^"]*"/m, () => `$ENDPOINT = "${base}/api/otel/logs"`)
    .replace(/^\$DASHBOARD_URL = "[^"]*"/m, () => `$DASHBOARD_URL = "${base}"`);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { response } = await requireSession();
  if (response) return response;

  const { file } = await params;
  const base = publicBaseUrl(req);

  let body: string | null = null;

  if (file === "setup-telemetry.ps1") {
    body = renderSetupTelemetry(base);
  } else if (STATIC_FILES[file]) {
    try {
      const raw = await readFile(path.join(process.cwd(), STATIC_FILES[file]), "utf8");
      body = rewriteEndpoints(raw, base);
    } catch {
      body = null;
    }
  }

  if (body === null) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
