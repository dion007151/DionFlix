import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { contentId } = (await request.json()) as { contentId: string };
  const db = await readDb();

  const exists = db.favorites.some((favorite) => favorite.userId === userId && favorite.contentId === contentId);

  if (exists) {
    db.favorites = db.favorites.filter((favorite) => !(favorite.userId === userId && favorite.contentId === contentId));
  } else {
    db.favorites.push({ userId, contentId });
  }

  await writeDb(db);
  return NextResponse.json({ favorited: !exists });
}
