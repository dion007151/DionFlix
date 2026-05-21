import { NextResponse } from "next/server";
import { enrichHistory, readDb, sanitizeUser } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const db = await readDb();
  const user = db.users.find((candidate) => candidate.id === userId);

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const favorites = db.favorites
    .filter((favorite) => favorite.userId === userId)
    .map((favorite) => {
      const item = db.contents.find((c) => c.id === favorite.contentId);
      if (!item) return null;
      return {
        ...item,
        episodes: item.episodes.length > 0 ? [item.episodes[0]] : []
      };
    })
    .filter(Boolean);

  const watchHistory = enrichHistory(db, userId);

  return NextResponse.json({
    user: sanitizeUser(user),
    favorites,
    watchHistory,
    continueWatching: watchHistory.filter((item) => item!.progress > 0 && item!.progress < 0.95)
  });
}
