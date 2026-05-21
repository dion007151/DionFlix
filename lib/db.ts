import { promises as fs, existsSync } from "fs";
import path from "path";
import zlib from "zlib";
import type { ContentItem, Database, Episode, User } from "./types";

const dbPath = path.join(process.cwd(), "data", "db.json");
const dbGzPath = path.join(process.cwd(), "data", "db.json.gz");

// Declare global augmentation for Next.js HMR preservation
declare global {
  var _cachedDb: Database | null;
  var _lastRead: number;
  var _writeTimeout: NodeJS.Timeout | null;
  var _pendingWritePromise: Promise<void> | null;
}

export async function readDb(): Promise<Database> {
  if (globalThis._cachedDb && Date.now() - (globalThis._lastRead || 0) < 60000) {
    return globalThis._cachedDb;
  }

  let dbData: Database;

  if (existsSync(dbPath)) {
    // If the raw db.json exists (local development), read it directly
    const json = await fs.readFile(dbPath, "utf8");
    dbData = JSON.parse(json) as Database;
  } else if (existsSync(dbGzPath)) {
    // If only compressed gz exists (production / github build), decompress and load it
    const compressed = await fs.readFile(dbGzPath);
    const decompressed = zlib.gunzipSync(compressed);
    dbData = JSON.parse(decompressed.toString("utf8")) as Database;
  } else {
    // Fallback if neither exists
    dbData = { contents: [], watchHistory: [], users: [], profiles: [] } as unknown as Database;
  }

  globalThis._cachedDb = dbData;
  globalThis._lastRead = Date.now();
  return globalThis._cachedDb;
}

export async function writeDb(db: Database) {
  globalThis._cachedDb = db;
  globalThis._lastRead = Date.now();

  // If there's already a pending write operation, we just update the cache (done above).
  // The pending write will eventually flush the latest state.
  if (globalThis._writeTimeout) {
    return;
  }

  // Create a debounced flush to disk (wait 3 seconds before writing)
  // This drastically reduces I/O bottleneck when hundreds of video players are saving progress simultaneously.
  globalThis._writeTimeout = setTimeout(async () => {
    try {
      if (globalThis._cachedDb) {
        const json = `${JSON.stringify(globalThis._cachedDb, null, 2)}\n`;
        
        // Write raw JSON locally for easy inspection and debugging
        await fs.writeFile(dbPath, json, "utf8");

        // Also write compressed gzip to automatically sync the version committed to GitHub
        const compressed = zlib.gzipSync(Buffer.from(json, "utf8"));
        await fs.writeFile(dbGzPath, compressed);
      }
    } catch (e) {
      console.error("Database flush failed:", e);
    } finally {
      globalThis._writeTimeout = null;
    }
  }, 3000);
}

export function sanitizeUser(user: User): User {
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

export function findContent(db: Database, id: string): ContentItem | undefined {
  return db.contents.find((item) => item.id === id);
}

export function findEpisode(db: Database, episodeId: string): { content: ContentItem; episode: Episode } | undefined {
  for (const content of db.contents) {
    const episode = content.episodes.find((item) => item.id === episodeId);
    if (episode) {
      const match = episode.id.match(/-s(\d+)e(\d+)/);
      const s = match ? match[1] : "1";
      const e = match ? match[2] : episode.number;
      const enrichedEpisode: Episode = {
        ...episode,
        description: episode.description || content.description,
        thumbnail: episode.thumbnail || content.posterImage || content.heroImage,
        videoUrl: episode.videoUrl || (content.id.includes("tt") ? `https://vidsrc.me/embed/tv?imdb=${content.id}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?imdb=${content.id}`),
        videoType: episode.videoType || "iframe",
      };
      return { content, episode: enrichedEpisode };
    }
  }

  return undefined;
}

export function enrichHistory(db: Database, userId: string) {
  return db.watchHistory
    .filter((item) => item.userId === userId)
    .map((item) => {
      const content = findContent(db, item.contentId);
      const episode = content?.episodes.find((candidate) => candidate.id === item.episodeId);

      if (!content || !episode) {
        return null;
      }

      const match = episode.id.match(/-s(\d+)e(\d+)/);
      const s = match ? match[1] : "1";
      const e = match ? match[2] : episode.number;
      const enrichedEpisode: Episode = {
        ...episode,
        description: episode.description || content.description,
        thumbnail: episode.thumbnail || content.posterImage || content.heroImage,
        videoUrl: episode.videoUrl || (content.id.includes("tt") ? `https://vidsrc.me/embed/tv?imdb=${content.id}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?imdb=${content.id}`),
        videoType: episode.videoType || "iframe",
      };

      const optimizedContent = {
        ...content,
        episodes: content.episodes.length > 0 ? [content.episodes[0]] : []
      };

      return { ...item, content: optimizedContent, episode: enrichedEpisode };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b!.updatedAt) - Date.parse(a!.updatedAt));
}

export function buildCatalog(contents: ContentItem[]) {
  // Only include items with valid HD images to guarantee a premium aesthetic
  const valid = contents.filter(c => c.heroImage && !c.heroImage.includes('unsplash'));
  
  const byTrending = [...valid].sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
  const byRelease = [...valid].sort((a, b) => Date.parse(b.releaseDate || '0') - Date.parse(a.releaseDate || '0'));

  const optimize = (items: ContentItem[]) => items.map(item => ({
    ...item,
    episodes: item.episodes.length > 0 ? [item.episodes[0]] : []
  }));

  return {
    featured: optimize(valid.filter((item) => item.featured).concat(byTrending.filter((item) => !item.featured)).slice(0, 5)),
    trending: optimize(byTrending.slice(0, 15)),
    popularAnime: optimize(byTrending.filter((item) => item.type === "Anime" || item.genres.includes("Animation") || item.genres.includes("Anime") || item.tags.includes("Popular Anime")).slice(0, 15)),
    horror: optimize(byTrending.filter((item) => item.genres.includes("Horror") || item.genres.includes("Thriller")).slice(0, 15)),
    action: optimize(byTrending.filter((item) => item.genres.includes("Action")).slice(0, 15)),
    sciFi: optimize(byTrending.filter((item) => item.genres.includes("Sci-Fi")).slice(0, 15)),
    newReleases: optimize(byRelease.filter(item => (item.trendingScore || 0) > 60).slice(0, 15))
  };
}
