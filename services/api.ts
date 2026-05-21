import type { CatalogResponse, ContentItem, Episode, User, UserLibraryResponse } from "@/lib/types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ message: "Request failed" }))) as { message?: string };
    throw new Error(error.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  catalog: () => request<CatalogResponse>("/api/catalog"),
  content: (id: string) => request<ContentItem>(`/api/content/${id}`),
  episode: (id: string) =>
    request<{ content: ContentItem; episode: Episode; nextEpisode: Episode | null }>(`/api/episode/${id}`),
  search: (query: string, genre: string) =>
    request<{ results: ContentItem[]; suggestions: string[] }>(
      `/api/search?q=${encodeURIComponent(query)}&genre=${encodeURIComponent(genre)}`
    ),
  login: (email: string, password: string) =>
    request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify({ action: "login", email, password })
    }),
  register: (name: string, email: string, password: string) =>
    request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify({ action: "register", name, email, password })
    }),
  firebaseLogin: (name: string, email: string, uid: string, avatar: string, provider?: string) =>
    request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify({ action: "firebase", name, email, uid, avatar, provider })
    }),
  library: (userId: string) => {
    if (!userId) return Promise.resolve({ favorites: [], continueWatching: [], watchHistory: [] } as unknown as UserLibraryResponse);
    return request<UserLibraryResponse>(`/api/users/${userId}/library`);
  },
  toggleFavorite: (userId: string, contentId: string) =>
    request<{ favorited: boolean }>(`/api/users/${userId}/favorites`, {
      method: "POST",
      body: JSON.stringify({ contentId })
    }),
  saveProgress: (userId: string, episodeId: string, seconds: number, duration: number) =>
    request<{ ok: boolean; progress: number }>(`/api/users/${userId}/history`, {
      method: "POST",
      body: JSON.stringify({ episodeId, seconds, duration })
    })
};
