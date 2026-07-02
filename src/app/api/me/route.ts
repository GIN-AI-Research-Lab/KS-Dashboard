import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      apiKey: true,
      team: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ user });
}
