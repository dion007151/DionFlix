"use client";

import type { ContentItem, UserLibraryResponse } from "@/lib/types";
import { ContentCard } from "./ContentCard";

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  userId: string;
  library?: UserLibraryResponse | null;
  onFavoriteChange?: () => void;
}

export function ContentRow({ title, items, userId, library, onFavoriteChange }: ContentRowProps) {
  const favoriteIds = new Set(library?.favorites.map((item) => item.id) ?? []);
  const progressByContent = new Map(
    library?.continueWatching.map((item) => [item.contentId, item.progress] as const) ?? []
  );

  if (!items.length) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-black text-white sm:text-2xl">{title}</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent ml-5" />
      </div>
      <div className="row-scroll flex gap-4 overflow-x-auto pb-6 pt-2">
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            userId={userId}
            progress={progressByContent.get(item.id)}
            favorited={favoriteIds.has(item.id)}
            onFavoriteChange={onFavoriteChange}
          />
        ))}
      </div>
    </section>
  );
}
