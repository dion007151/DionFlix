export type Genre = "Action" | "Romance" | "Comedy" | "Horror" | "Fantasy" | "Sci-Fi" | "Mystery" | "Animation" | "Anime" | "Thriller" | "Adventure" | string;

export type VideoType = "mp4" | "hls" | "iframe";

export interface Episode {
  id: string;
  contentId: string;
  number: number;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  videoType: VideoType;
  duration: number;
}

export interface ContentItem {
  id: string;
  title: string;
  type: "Anime" | "Movie" | "Series";
  year: number;
  rating: string;
  duration: string;
  genres: Genre[];
  tags: string[];
  description: string;
  heroImage: string;
  posterImage: string;
  backdropColor: string;
  featured: boolean;
  trendingScore: number;
  releaseDate: string;
  episodes: Episode[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  provider?: "google" | "facebook" | "email";
}

export interface Favorite {
  userId: string;
  contentId: string;
}

export interface WatchHistory {
  userId: string;
  contentId: string;
  episodeId: string;
  progress: number;
  seconds: number;
  duration: number;
  updatedAt: string;
}

export interface Database {
  users: User[];
  favorites: Favorite[];
  watchHistory: WatchHistory[];
  contents: ContentItem[];
}

export interface CatalogResponse {
  featured: ContentItem[];
  trending: ContentItem[];
  popularAnime: ContentItem[];
  horror: ContentItem[];
  action: ContentItem[];
  sciFi: ContentItem[];
  newReleases: ContentItem[];
}

export interface UserLibraryResponse {
  user: User;
  favorites: ContentItem[];
  watchHistory: Array<WatchHistory & { content: ContentItem; episode: Episode }>;
  continueWatching: Array<WatchHistory & { content: ContentItem; episode: Episode }>;
}
