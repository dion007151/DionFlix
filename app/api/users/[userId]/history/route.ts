import { NextResponse } from "next/server";
import { findEpisode, readDb, writeDb } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const payload = (await request.json()) as {
    episodeId: string;
    seconds: number;
    duration: number;
  };

  const db = await readDb();
  const result = findEpisode(db, payload.episodeId);

  if (!result) {
    return NextResponse.json({ message: "Episode not found" }, { status: 404 });
  }

  const progress = payload.duration > 0 ? Math.min(payload.seconds / payload.duration, 1) : 0;
  const existing = db.watchHistory.find((item) => item.userId === userId && item.episodeId === payload.episodeId);

  if (existing) {
    existing.seconds = Math.floor(payload.seconds);
    existing.duration = Math.floor(payload.duration);
    existing.progress = progress;
    existing.updatedAt = new Date().toISOString();
  } else {
    db.watchHistory.push({
      userId,
      contentId: result.content.id,
      episodeId: result.episode.id,
      seconds: Math.floor(payload.seconds),
      duration: Math.floor(payload.duration),
      progress,
      updatedAt: new Date().toISOString()
    });
  }

  await writeDb(db);
  return NextResponse.json({ ok: true, progress });
}
