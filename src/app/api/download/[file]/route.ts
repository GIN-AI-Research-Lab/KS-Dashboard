import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Whitelist of files users can download from the Integrate page.
const FILES: Record<string, string> = {
  "install-managed-settings.ps1": "deploy/install-managed-settings.ps1",
  "setup-telemetry.ps1": "scripts/setup-telemetry.ps1",
};

const CONTENT_TYPE: Record<string, string> = {
  ".ps1": "text/plain; charset=utf-8",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { response } = await requireSession();
  if (response) return response;

  const { file } = await params;
  const rel = FILES[file];
  if (!rel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Read as raw bytes so both text scripts and binary installers stream intact.
    const content = await readFile(path.join(process.cwd(), rel));
    const ext = path.extname(file).toLowerCase();
    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": CONTENT_TYPE[ext] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
