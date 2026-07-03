import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Whitelist of deploy scripts users can download from the Integrate page.
const FILES: Record<string, string> = {
  "install-managed-settings.ps1": "deploy/install-managed-settings.ps1",
  "setup-telemetry.ps1": "scripts/setup-telemetry.ps1",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { response } = await requireSession();
  if (response) return response;

  const { file } = await params;
  const rel = FILES[file];
  if (!rel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const content = await readFile(path.join(process.cwd(), rel), "utf8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
