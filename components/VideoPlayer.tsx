"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Image as ImageIcon, Maximize, MonitorPlay, Play, RadioTower, SkipForward } from "lucide-react";
import Image from "next/image";
import Hls from "hls.js";
import type { ContentItem, Episode, UserLibraryResponse } from "@/lib/types";
import { api } from "@/services/api";

interface VideoPlayerProps {
  content: ContentItem;
  episode: Episode;
  nextEpisode: Episode | null;
  userId: string;
  library: UserLibraryResponse | null;
}

export function VideoPlayer({ content, episode, nextEpisode, userId, library }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const saveRef = useRef(0);
  const progressPaintRef = useRef(0);
  const nextTimerRef = useRef<number | null>(null);
  const router = useRouter();
  const [theater, setTheater] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [showNext, setShowNext] = useState(false);
  const [server, setServer] = useState(0); // Default to VidSrc ME (ultra-reliable, bypasses embed.su DNS errors)
  const [serverPings, setServerPings] = useState<Record<number, number>>({});
  const [isFavorited, setIsFavorited] = useState(() => library?.favorites.some((f) => f.id === content.id) ?? false);
  const activeIndex = content.episodes.findIndex((e) => e.id === episode.id);
  const [visibleCount, setVisibleCount] = useState(() => Math.max(20, activeIndex + 10));

  const toggleFavorite = async () => {
    if (!userId) return;
    setIsFavorited(!isFavorited);
    await api.toggleFavorite(userId, content.id).catch(() => setIsFavorited(isFavorited));
  };

  const isTV = episode.id.includes("-s");
  const seasonMatch = episode.id.match(/-s(\d+)e(\d+)/);
  const s = seasonMatch ? seasonMatch[1] : "1";
  const e = seasonMatch ? seasonMatch[2] : "1";

  const servers = [
    { name: "Server 1 (VidSrc ME - Auto)", getUrl: () => episode.videoUrl },
    { name: "Server 2 (VidSrc IN - Fast)", getUrl: () => isTV ? `https://vidsrc.in/embed/tv?imdb=${content.id}&season=${s}&episode=${e}` : `https://vidsrc.in/embed/movie?imdb=${content.id}` },
    { name: "Server 3 (MultiEmbed - HD)", getUrl: () => isTV ? `https://multiembed.mov/?video_id=${content.id}&s=${s}&e=${e}` : `https://multiembed.mov/?video_id=${content.id}` },
    { name: "Server 4 (VidLink Pro - Backup)", getUrl: () => isTV ? `https://vidlink.pro/tv/${content.id}/${s}/${e}` : `https://vidlink.pro/movie/${content.id}` },
  ];

  useEffect(() => {
    if (episode.videoType !== "iframe") return;

    let isMounted = true;
    
    const checkPings = async () => {
      const results: Record<number, number> = {};
      
      await Promise.all(servers.map(async (s, index) => {
        try {
          const start = performance.now();
          const url = new URL(s.getUrl());
          // If the network request fails or times out, throw an error immediately to flag the server as dead
          const res = await fetch(url.origin, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(2500) });
          const ping = Math.round(performance.now() - start);
          results[index] = ping;
          if (isMounted) setServerPings(prev => ({ ...prev, [index]: ping }));
        } catch {
          results[index] = 9999;
          if (isMounted) setServerPings(prev => ({ ...prev, [index]: 9999 }));
        }
      }));

      if (isMounted) {
        let bestIndex = 0;
        let bestPing = Infinity;

        for (const [idx, ping] of Object.entries(results)) {
          if (ping < bestPing && ping < 3000) {
            bestPing = ping;
            bestIndex = Number(idx);
          }
        }
        
        // ALWAYS auto-switch to the absolute fastest available server!
        // This eliminates the need for the user to ever manually change it.
        if (bestPing < 3000 && bestIndex !== server) {
          setServer(bestIndex);
        }
      }
    };
    
    checkPings();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.videoType]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let hls: Hls | null = null;
    setProgress(0);
    setShowNext(false);

    if (episode.videoType === "hls" && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(episode.videoUrl);
      hls.attachMedia(video);
    } else if (episode.videoType !== "iframe") {
      video.src = episode.videoUrl;
    }

    // Since we cannot read exact progress from a cross-origin iframe, we explicitly save 
    // a tiny amount of progress immediately so it registers in the user's Watch History.
    if (episode.videoType === "iframe") {
      api.saveProgress(userId, episode.id, 1, 1440).catch(() => undefined);
    }

    const saved = library?.watchHistory.find((item) => item.episodeId === episode.id);
    const restore = () => {
      if (saved && saved.seconds > 0.2 && saved.progress < 0.95) {
        video.currentTime = saved.seconds;
      }
    };

    video.addEventListener("loadedmetadata", restore, { once: true });
    if (nextEpisode) {
      router.prefetch(`/watch/${nextEpisode.id}`);
    }

    return () => {
      if (nextTimerRef.current) {
        window.clearTimeout(nextTimerRef.current);
        nextTimerRef.current = null;
      }
      video.removeEventListener("loadedmetadata", restore);
      hls?.destroy();
    };
  }, [episode, library, nextEpisode, router, userId]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
    }
  }, [speed]);

  const saveProgress = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) {
      return;
    }

    const now = Date.now();
    if (now - progressPaintRef.current > 180) {
      progressPaintRef.current = now;
      setProgress(video.currentTime / video.duration);
    }

    if (now - saveRef.current > 4500) {
      saveRef.current = now;
      api.saveProgress(userId, episode.id, video.currentTime, video.duration).catch(() => undefined);
    }
  };

  const goNext = () => {
    if (nextEpisode) {
      router.push(`/watch/${nextEpisode.id}`);
    }
  };

  const fullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      const el = containerRef.current || videoRef.current;
      el?.requestFullscreen?.().catch(() => undefined);
    }
  };

  return (
    <section className={`mx-auto w-full px-4 pt-24 sm:px-6 lg:px-8 ${theater ? "max-w-none" : "max-w-7xl"}`}>
      <div className={`grid gap-5 ${theater ? "lg:grid-cols-[1fr_360px]" : "lg:grid-cols-[minmax(0,1fr)_360px]"}`}>
        <div ref={containerRef} className="overflow-hidden rounded-md border border-white/10 bg-black shadow-2xl">
          <div className="relative aspect-video bg-black">
            {episode.videoType === "iframe" ? (
              <iframe
                src={`${servers[server].getUrl()}${servers[server].getUrl().includes("?") ? "&" : "?"}autoplay=1`}
                className="h-full w-full border-0"
                loading="eager"
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              />
            ) : (
              <video
                ref={videoRef}
                className="h-full w-full"
                controls
                playsInline
                preload="auto"
                poster={episode.thumbnail || content.heroImage || content.posterImage}
                onTimeUpdate={saveProgress}
                onEnded={() => {
                  api.saveProgress(userId, episode.id, videoRef.current?.duration ?? episode.duration, videoRef.current?.duration ?? episode.duration);
                  setShowNext(true);
                  nextTimerRef.current = window.setTimeout(goNext, 350);
                }}
              />
            )}
            {showNext && nextEpisode && (
              <button
                type="button"
                onClick={goNext}
                className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-black text-ink shadow-glow"
              >
                <SkipForward className="h-5 w-5" />
                Next Episode
              </button>
            )}
          </div>

          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-none border-x-0 border-b-0 p-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/60">
                  <RadioTower className="h-3 w-3 text-volt" />
                  DionFlix provided stream
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/60">
                  {episode.videoType}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">{content.title}</p>
                <button
                  type="button"
                  onClick={toggleFavorite}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                    isFavorited ? "border-flare bg-flare text-white shadow-[0_0_15px_rgba(255,45,85,0.5)]" : "border-white/15 bg-white/5 text-white/70 hover:border-flare hover:text-white"
                  }`}
                  title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={`h-3 w-3 ${isFavorited ? "fill-current" : ""}`} />
                </button>
              </div>
              <h1 className="mt-1 text-xl font-black text-white">
                E{episode.number}: {episode.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {episode.videoType === "iframe" && (
                <div className="flex items-center gap-2 rounded-md border border-plasma/30 bg-plasma/10 p-1 pl-3">
                  <span className="hidden text-xs font-bold text-plasma sm:inline">Unavailable? Change server:</span>
                  <select
                    value={server}
                    onChange={(event) => setServer(Number(event.target.value))}
                    className="h-8 rounded border border-white/10 bg-white/10 px-2 text-sm font-bold text-white outline-none"
                    title="Video Server"
                  >
                    {servers.map((s, i) => (
                      <option key={i} value={i} className="bg-ink">
                        {s.name} {serverPings[i] !== undefined ? (serverPings[i] > 3000 ? '(Timeout)' : `(${serverPings[i]}ms)`) : '(Pinging...)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <select
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                className="h-10 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none"
                title="Playback speed"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => (
                  <option key={value} value={value} className="bg-ink">
                    {value}x
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTheater((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/10 text-white transition hover:border-volt"
                title="Theater mode"
              >
                <MonitorPlay className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={fullscreen}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/10 text-white transition hover:border-plasma"
                title="Fullscreen"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="h-1 bg-white/10">
            <div className="progress-fill h-full bg-gradient-to-r from-flare via-plasma to-volt" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <aside className="glass h-fit rounded-md p-4">
          <div className="mb-4 overflow-hidden rounded-md border border-white/10 bg-white/5">
            <div className="relative aspect-video">
              <Image 
                fill
                sizes="(max-width: 1024px) 100vw, 800px"
                quality={90}
                src={episode.thumbnail || content.heroImage || content.posterImage} 
                alt={`${episode.title} video preview`} 
                priority
                className="object-cover" 
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=800&q=80";
                  e.currentTarget.srcset = "";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <div className="absolute bottom-3 left-3 flex max-w-[85%] items-center gap-2 text-sm font-black text-white">
                <ImageIcon className="h-4 w-4 shrink-0 text-volt" />
                <span className="truncate">{content.title} Preview</span>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">Episodes</p>
            <h2 className="mt-1 text-lg font-black text-white">{content.episodes.length} available</h2>
          </div>
          <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {content.episodes.slice(0, visibleCount).map((item) => {
              const active = item.id === episode.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/watch/${item.id}`)}
                  className={`flex w-full gap-3 rounded-md border p-2 text-left transition ${
                    active ? "border-plasma bg-plasma/15" : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded">
                    <Image 
                      fill
                      sizes="300px"
                      quality={85}
                      src={item.thumbnail || content.heroImage || content.posterImage} 
                      alt="" 
                      className="object-cover" 
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=400&q=80";
                        e.currentTarget.srcset = "";
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Play className="h-5 w-5 fill-white" />
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">E{item.number}: {item.title}</p>
                    <p className="line-clamp-2 mt-1 text-xs leading-5 text-white/58">{item.description}</p>
                  </div>
                </button>
              );
            })}
            
            {content.episodes.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="mt-4 w-full rounded-md border border-white/10 bg-white/5 py-3 text-sm font-bold text-white transition hover:bg-white/10 hover:border-white/20"
              >
                Load More Episodes
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
