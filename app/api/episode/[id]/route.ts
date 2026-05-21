import { NextResponse } from "next/server";
import { findEpisode, readDb } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const result = findEpisode(db, id);

  if (!result) {
    return NextResponse.json({ message: "Episode not found" }, { status: 404 });
  }

  const nextEpisode = result.content.episodes.find((episode) => episode.number === result.episode.number + 1);

  return NextResponse.json({
    ...result,
    nextEpisode: nextEpisode ?? null
  });
}
