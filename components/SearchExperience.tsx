"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import type { ContentItem } from "@/lib/types";
import { api } from "@/services/api";
import { useLocalUser } from "@/hooks/useLocalUser";
import { AppShell } from "./AppShell";
import { ContentCard } from "./ContentCard";

const genres = ["", "Anime", "Action", "Romance", "Comedy", "Horror", "Fantasy", "Sci-Fi"];

export function SearchExperience() {
  const { user } = useLocalUser();
  const userId = user?.id ?? "";
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [results, setResults] = useState<ContentItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(() => {
    if (!userId) return;
    api.library(userId).then((library) => setFavoriteIds(new Set(library.favorites.map((item) => item.id))));
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      api.search(query, genre).then((data) => {
        setResults(data.results);
        setSuggestions(data.suggestions);
      });
    }, 350); // Increased debounce to 350ms to make typing perfectly smooth

    return () => window.clearTimeout(timer);
  }, [query, genre]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-volt">Live Discovery</p>
          <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">Find your next obsession.</h1>
        </div>

        <div className="glass sticky top-20 z-20 mb-8 rounded-md p-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search anime, movies, moods, genres..."
                className="h-14 w-full rounded-md border border-white/10 bg-white/8 pl-12 pr-4 text-white outline-none transition placeholder:text-white/35 focus:border-plasma"
              />
            </label>
            <div className="flex items-center gap-2 overflow-x-auto">
              <SlidersHorizontal className="hidden h-5 w-5 text-white/45 sm:block" />
              {genres.map((item) => (
                <button
                  key={item || "all"}
                  type="button"
                  onClick={() => setGenre(item)}
                  className={`h-12 shrink-0 rounded-md border px-4 text-sm font-bold transition ${
                    genre === item
                      ? "border-plasma bg-plasma text-white shadow-glow"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
                  }`}
                >
                  {item || "All"}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-3 flex flex-wrap gap-2"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuery(suggestion)}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/75 transition hover:bg-white/15 hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {results.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                userId={userId}
                favorited={favoriteIds.has(item.id)}
                onFavoriteChange={loadFavorites}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </section>
    </AppShell>
  );
}
