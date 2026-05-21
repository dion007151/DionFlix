"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Play } from "lucide-react";
import Image from "next/image";
import type { ContentItem } from "@/lib/types";

export function HeroCarousel({ items }: { items: ContentItem[] }) {
  const [index, setIndex] = useState(0);
  const active = items[index] ?? items[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!active) {
    return null;
  }

  return (
    <section className="relative min-h-[82vh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.9 }}
          className="absolute inset-0"
        >
          <Image 
            fill
            priority
            sizes="100vw"
            quality={100}
            src={active.heroImage} 
            alt="" 
            className="object-cover" 
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=2200&q=80";
              e.currentTarget.srcset = "";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-7xl items-end px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/80 backdrop-blur-xl">
              Featured on DionFlix
            </div>
            <h1 className="text-5xl font-black leading-[0.95] text-white sm:text-7xl lg:text-8xl">{active.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-bold text-white/75">
              <span className="text-emerald-300">{active.trendingScore}% Match</span>
              <span>{active.year}</span>
              <span>{active.rating}</span>
              <span>{active.duration}</span>
              <span>{active.genres.join(" / ")}</span>
              {active.tags?.filter((t: string) => t.includes('Audio') || t.includes('Subs')).map((t: string) => (
                <span key={t} className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-xs font-bold text-white">{t}</span>
              ))}
            </div>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">{active.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/watch/${active.episodes[0].id}`}
                className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-black text-ink transition hover:scale-105"
              >
                <Play className="h-5 w-5 fill-current" />
                Play
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-xl transition hover:border-plasma hover:bg-white/15"
              >
                <Info className="h-5 w-5" />
                More Like This
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 right-4 z-20 flex gap-2 sm:right-8">
        {items.map((item, dotIndex) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIndex(dotIndex)}
            className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-10 bg-white" : "w-4 bg-white/35"}`}
            title={item.title}
          />
        ))}
      </div>
    </section>
  );
}
