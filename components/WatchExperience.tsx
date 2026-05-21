"use client";

import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { SkeletonRows } from "./SkeletonRows";
import { VideoPlayer } from "./VideoPlayer";
import { useLocalUser } from "@/hooks/useLocalUser";
import { api } from "@/services/api";
import type { ContentItem, Episode, UserLibraryResponse } from "@/lib/types";

export function WatchExperience({ episodeId }: { episodeId: string }) {
  const { user } = useLocalUser();
  const userId = user?.id ?? "";
  const [data, setData] = useState<{ content: ContentItem; episode: Episode; nextEpisode: Episode | null } | null>(null);
  const [library, setLibrary] = useState<UserLibraryResponse | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([api.episode(episodeId), api.library(userId)])
      .then(([episodeData, libraryData]) => {
        if (active) {
          setData(episodeData);
          setLibrary(libraryData);
        }
      })
      .catch(() => {
        if (active) {
          setData(null);
        }
      });

    return () => {
      active = false;
    };
  }, [episodeId, userId]);

  if (!data) {
    return (
      <AppShell>
        <SkeletonRows />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Apple TV+ Style Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -inset-20 opacity-40 blur-[120px] animate-pulse"
          style={{
            backgroundImage: `url(${data.content.heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            animationDuration: "8s",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/80 to-ink" />
      </div>
      <div className="relative z-10 pb-24">
        <VideoPlayer
          content={data.content}
          episode={data.episode}
          nextEpisode={data.nextEpisode}
          userId={userId}
          library={library}
        />
      </div>
    </AppShell>
  );
}
