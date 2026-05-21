import { NextResponse } from "next/server";
import { findContent, readDb } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const content = findContent(db, id);

  if (!content) {
    return NextResponse.json({ message: "Content not found" }, { status: 404 });
  }

  return NextResponse.json(content);
}
