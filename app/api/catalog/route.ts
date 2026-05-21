import { NextResponse } from "next/server";
import { buildCatalog, readDb } from "@/lib/db";

export async function GET() {
  const db = await readDb();
  return NextResponse.json(buildCatalog(db.contents));
}
