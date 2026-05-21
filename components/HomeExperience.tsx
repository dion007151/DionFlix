"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserLibraryResponse } from "@/lib/types";
import { api } from "@/services/api";
import { useCatalog } from "@/hooks/useCatalog";
import { useLocalUser } from "@/hooks/useLocalUser";
import { AppShell } from "./AppShell";
import { ContentRow } from "./ContentRow";
import { HeroCarousel } from "./HeroCarousel";
import { SkeletonRows } from "./SkeletonRows";

export function HomeExperience() {
  const { catalog, loading } = useCatalog();
  const { user } = useLocalUser();
  const [library, setLibrary] = useState<UserLibraryResponse | null>(null);

  const userId = user?.id ?? "";

  const refreshLibrary = useCallback(() => {
    if (!userId) return;
    api.library(userId).then(setLibrary).catch(() => setLibrary(null));
  }, [userId]);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  if (loading || !catalog) {
    return (
      <AppShell>
        <SkeletonRows />
      </AppShell>
    );
  }

  const continueItems = library?.continueWatching.map((item) => item.content) ?? [];

  return (
    <AppShell>
      <HeroCarousel items={catalog.featured} />
      <div className="-mt-6 space-y-8 pb-24">
        <ContentRow
          title="Continue Watching"
          items={continueItems}
          userId={userId}
          library={library}
          onFavoriteChange={refreshLibrary}
        />
        <ContentRow title="Trending Now" items={catalog.trending} userId={userId} library={library} onFavoriteChange={refreshLibrary} />
        <ContentRow
          title="Popular Anime"
          items={catalog.popularAnime}
          userId={userId}
          library={library}
          onFavoriteChange={refreshLibrary}
        />
        <ContentRow
          title="New Releases"
          items={catalog.newReleases}
          userId={userId}
          library={library}
          onFavoriteChange={refreshLibrary}
        />
        <ContentRow
          title="Action & Adventure"
          items={catalog.action}
          userId={userId}
          library={library}
          onFavoriteChange={refreshLibrary}
        />
        <ContentRow
          title="Horror & Thriller"
          items={catalog.horror}
          userId={userId}
          library={library}
          onFavoriteChange={refreshLibrary}
        />
        <ContentRow
          title="Sci-Fi & Fantasy"
          items={catalog.sciFi}
          userId={userId}
          library={library}
          onFavoriteChange={refreshLibrary}
        />
      </div>
    </AppShell>
  );
}
