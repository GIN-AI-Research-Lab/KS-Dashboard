import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

// Store uploaded images on the local filesystem (not in the DB) and return a URL
// served by /api/uploads/[name]. Only the path is ever stored in the DB.
export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Thiếu file" }, { status: 422 });

  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Chỉ nhận ảnh PNG/JPG/GIF/WebP" }, { status: 422 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Ảnh quá lớn (>5MB)" }, { status: 422 });

  const buf = Buffer.from(await file.arrayBuffer());
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);

  return NextResponse.json({ url: `/api/uploads/${name}` });
}
