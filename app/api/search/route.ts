import { NextResponse } from "next/server";
import type { Genre } from "@/lib/types";
import { readDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const genre = searchParams.get("genre") as Genre | null;
  const db = await readDb();

  const results = db.contents.filter((item) => {
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.genres.some((candidate) => candidate.toLowerCase().includes(q));
    const matchesGenre = !genre || item.genres.includes(genre);

    return matchesQuery && matchesGenre;
  }).slice(0, 50).map((item) => ({
    ...item,
    episodes: item.episodes.length > 0 ? [item.episodes[0]] : []
  }));

  const suggestions = q
    ? db.contents
        .filter((item) => item.title.toLowerCase().includes(q))
        .map((item) => item.title)
        .slice(0, 5)
    : [];

  return NextResponse.json({ results, suggestions });
}
