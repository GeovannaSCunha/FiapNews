// src/server/api.ts
import axios from "axios";

/** API pública de notícias (DEV.to) */
const devtoApi = axios.create({
  baseURL: "https://dev.to/api",
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
