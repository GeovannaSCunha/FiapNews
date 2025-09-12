// src/server/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "https://dev.to/api",
  timeout: 10000,
});

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

type FetchParams = {
  page?: number;
  topics?: string[]; // tags do DEV.to
};

// Busca notícias por tópicos (tags). Se não houver tópico, usa "technology".
export async function fetchTechNews({
  page = 1,
  topics = [],
}: FetchParams = {}): Promise<ArticleSummary[]> {
  const params: Record<string, string | number> = { per_page: 20, page };

  const cleaned = topics.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    params.tag = "technology";
  } else if (cleaned.length === 1) {
    params.tag = cleaned[0];
  } else {
    // DEV.to suporta múltiplas tags via "tags"
    params.tags = cleaned.join(",");
  }

  const { data } = await api.get<ArticleSummary[]>("/articles", { params });
  return data;
}

export async function fetchArticleById(id: number): Promise<ArticleDetails> {
  const { data } = await api.get<ArticleDetails>(`/articles/${id}`);
  return data;
}
