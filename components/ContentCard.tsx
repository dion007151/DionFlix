"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Play, RadioTower } from "lucide-react";
import Image from "next/image";
import type { ContentItem } from "@/lib/types";
import { api } from "@/services/api";

interface ContentCardProps {
  item: ContentItem;
  userId: string;
  progress?: number;
  favorited?: boolean;
  onFavoriteChange?: () => void;
}

export function ContentCard({ item, userId, progress, favorited, onFavoriteChange }: ContentCardProps) {
  const firstEpisode = item.episodes[0];
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (isHovered && firstEpisode?.videoUrl) {
      try {
        const url = new URL(firstEpisode.videoUrl);
        fetch(url.origin, { mode: 'no-cors', cache: 'default' }).catch(() => null);
      } catch {}
    }
  }, [isHovered, firstEpisode]);

  const toggleFavorite = async () => {
    await api.toggleFavorite(userId, item.id);
    onFavoriteChange?.();
  };

  return (
    <article 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className="media-card group relative min-w-[230px] overflow-hidden rounded-md border border-white/10 bg-white/5 shadow-2xl sm:min-w-[280px]"
    >
      <div 
        className="pointer-events-none absolute -inset-px rounded-md opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(168, 85, 247, 0.4), transparent 80%)`,
          zIndex: 1
        }}
      />
      <Link href={`/watch/${firstEpisode.id}`} className="block relative z-10">
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            fill
            src={firstEpisode?.thumbnail || item.heroImage || item.posterImage}
            alt={item.title}
            sizes="(max-width: 640px) 400px, 600px"
            quality={90}
            className="media-image object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=800&q=80";
              e.currentTarget.srcset = "";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent opacity-90" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-md">
            <RadioTower className="h-3 w-3 text-volt" />
            Provided
          </div>
          <div className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-md">
            {firstEpisode.videoType}
          </div>
          <div className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.28),transparent_48%)]" />
            <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-glow">
              <Play className="ml-1 h-6 w-6 fill-current" />
            </span>
          </div>
          {typeof progress === "number" && (
            <div className="absolute inset-x-3 bottom-3 h-1 rounded-full bg-white/20">
              <div className="progress-fill h-full rounded-full bg-gradient-to-r from-flare via-plasma to-volt" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">{item.title}</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/50">
              {item.type} / {item.year} / {item.rating}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleFavorite}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
              favorited ? "border-flare bg-flare text-white" : "border-white/15 bg-white/5 text-white/70 hover:border-flare hover:text-white"
            }`}
            title={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
          </button>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-white/65">{item.description}</p>
        <div className="flex flex-wrap gap-2">
          {item.genres.slice(0, 3).map((genre) => (
            <span key={genre} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
              {genre}
            </span>
          ))}
          {item.tags?.filter((t: string) => t.includes('Audio') || t.includes('Subs')).map((tag: string) => (
             <span key={tag} className="rounded-full border border-plasma/40 bg-plasma/10 px-2.5 py-1 text-[10px] font-bold text-plasma">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
