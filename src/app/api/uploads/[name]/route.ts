import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // Only allow the exact hashed filenames we generate -- blocks path traversal.
  if (!/^[a-f0-9]{32}\.(png|jpg|jpeg|gif|webp)$/i.test(name)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    const ext = name.split(".").pop()!.toLowerCase();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
