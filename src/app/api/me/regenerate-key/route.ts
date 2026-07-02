import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/api-key";

export async function POST() {
  const { session, response } = await requireSession();
  if (response) return response;

  const apiKey = generateApiKey();
  await prisma.user.update({ where: { id: session!.user.id }, data: { apiKey } });

  return NextResponse.json({ apiKey });
}
