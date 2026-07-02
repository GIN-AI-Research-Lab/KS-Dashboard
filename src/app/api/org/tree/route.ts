import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      teams: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ departments });
}
