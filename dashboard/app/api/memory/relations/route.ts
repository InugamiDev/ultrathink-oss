import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ relations: [] });
  }

  try {
    const { getMemoryRelations } = await import("@/lib/memory");
    const relations = await getMemoryRelations();
    return NextResponse.json({ relations });
  } catch {
    return NextResponse.json({ relations: [] });
  }
}
