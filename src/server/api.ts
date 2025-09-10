// src/server/api.ts
import axios from "axios";

/** API pública de notícias (DEV.to) */
const devtoApi = axios.create({
  baseURL: "https://dev.to/api",
  timeout: 10000,
});

/** Backend local (JSON Server) para favoritos */
const appApi = axios.create({
  baseURL: "http://localhost:8081",
  timeout: 10000,
});

/* ===== Tipos ===== */
export type ArticleSummary = {
  id: number;
  title: string;
  description: string | null;
  cover_image: string | null;
  url: string;
  readable_publish_date: string;
  user?: { name?: string };
};

export type ArticleDetails = ArticleSummary & {
  body_markdown?: string;
};

export type Favorite = {
  id: number;        // id do favorito no JSON Server
  articleId: number; // id do artigo (DEV.to)
};

/* ===== Notícias (DEV.to) ===== */
export async function fetchTechNews(
  page = 1,
  topics: string[] = []
): Promise<ArticleSummary[]> {
  const params: Record<string, string | number> = { per_page: 20, page };

  const cleaned = topics.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    params.tag = "technology";
  } else if (cleaned.length === 1) {
    params.tag = cleaned[0];
  } else {
    params.tags = cleaned.join(","); // múltiplas tags
  }

  const { data } = await devtoApi.get<ArticleSummary[]>("/articles", { params });
  return data;
}

export async function fetchArticleById(id: number): Promise<ArticleDetails> {
  const { data } = await devtoApi.get<ArticleDetails>(`/articles/${id}`);
  return data;
}

/* ===== Favoritos (JSON Server) ===== */
export async function getFavorites(): Promise<Favorite[]> {
  const { data } = await appApi.get<Favorite[]>("/favorites");
  return data;
}

export async function saveFavorite(articleId: number): Promise<Favorite> {
  const { data } = await appApi.post<Favorite>("/favorites", { articleId });
  return data;
}

export async function deleteFavorite(favoriteId: number): Promise<void> {
  await appApi.delete(`/favorites/${favoriteId}`);
}
