"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, Heart, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserLibraryResponse } from "@/lib/types";
import { api } from "@/services/api";
import { useLocalUser } from "@/hooks/useLocalUser";
import { AppShell } from "./AppShell";
import { ContentRow } from "./ContentRow";
import { SkeletonRows } from "./SkeletonRows";

function SafeAvatar({ user }: { user: any }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [user?.id, user?.avatar]);

  const initials = user?.name
    ? user.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  if (failed || !user?.avatar || !user.avatar.startsWith("http")) {
    return <span className="text-sm font-black">{user?.avatar && user.avatar.length <= 2 ? user.avatar : initials}</span>;
  }

  return (
    <img 
      src={user.avatar} 
      alt="Profile" 
      className="h-full w-full object-cover" 
      onError={() => setFailed(true)}
    />
  );
}

export function ProfileView() {
  const { user, ready } = useLocalUser();
  const [library, setLibrary] = useState<UserLibraryResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.push("/auth");
    }
  }, [user, ready, router]);

  const refresh = useCallback(() => {
    if (user) {
      api.library(user.id)
        .then(setLibrary)
        .catch(() => {
          // Fallback if backend returns 404 or container resets
          setLibrary({
            user: user,
            favorites: [],
            watchHistory: [],
            continueWatching: []
          });
        });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [refresh, user]);

  if (!ready || !user || !library) {
    return (
      <AppShell>
        <SkeletonRows />
      </AppShell>
    );
  }

  // Prioritize the local user metadata for UI rendering
  const activeUser = user || library.user;

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
        <div className="glass mb-9 grid gap-6 rounded-md p-5 sm:grid-cols-[auto_1fr] sm:p-7">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-flare via-plasma to-volt text-3xl font-black shadow-glow">
            <SafeAvatar user={activeUser} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/45">DionFlix Profile</p>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-4xl font-black text-white">{activeUser.name}</h1>
              {((activeUser.provider === "google") || activeUser.avatar?.includes("googleusercontent.com")) && (
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </div>
              )}
              {((activeUser.provider === "facebook") || (!(activeUser.provider) && (activeUser.email?.includes("@facebook.com") || activeUser.email?.includes("@oauth.com") || activeUser.avatar === "FB" || activeUser.avatar?.includes("facebook.com") || activeUser.avatar?.includes("fbcdn.net")))) && (
                <div className="flex items-center gap-1.5 rounded-full bg-[#1877F2]/20 px-3 py-1 text-xs font-bold text-[#1877F2] backdrop-blur-sm">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </div>
              )}
            </div>
            {!activeUser.email.includes("@facebook.com") && !activeUser.email.includes("@oauth.com") && (
              <p className="mt-2 text-white/60">{activeUser.email}</p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat icon={Heart} label="Favorites" value={library.favorites.length} />
              <Stat icon={Clock3} label="History" value={library.watchHistory.length} />
              <Stat icon={Play} label="Continue" value={library.continueWatching.length} />
            </div>
          </div>
        </div>

        <div className="mb-10">
          <ContentRow title="My Favorites" items={library.favorites} userId={user.id} library={library} onFavoriteChange={refresh} />
        </div>

        <section>
          <div className="mb-4 flex items-end gap-5">
            <h2 className="text-2xl font-black text-white">Watch History</h2>

            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
          </div>
          <div className="grid gap-3">
            {library.watchHistory.map((item) => (
              <Link
                href={`/watch/${item.episodeId}`}
                key={`${item.episodeId}-${item.updatedAt}`}
                className="glass grid gap-4 rounded-md p-3 transition hover:border-plasma/50 sm:grid-cols-[180px_1fr_auto]"
              >
                <img 
                  src={item.episode.thumbnail || item.content.heroImage || item.content.posterImage} 
                  alt="" 
                  className="h-28 w-full rounded object-cover sm:w-44"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=400&q=80";
                  }}
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">{item.content.title}</p>
                  <h3 className="mt-1 text-lg font-black text-white">
                    E{item.episode.number}: {item.episode.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/58">{item.episode.description}</p>
                </div>
                <div className="flex min-w-36 flex-col justify-center">
                  <p className="text-sm font-bold text-white">{Math.round(item.progress * 100)}% watched</p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-flare via-plasma to-volt" style={{ width: `${item.progress * 100}%` }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3">
      <Icon className="mb-2 h-5 w-5 text-volt" />
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-white/45">{label}</p>
    </div>
  );
}
