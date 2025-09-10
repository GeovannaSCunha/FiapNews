import axios from "axios";

export const api = axios.create({
  baseURL: "https://dev.to/api",
  timeout: 10000,
});

// Tipos
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

// Lista notícias de tecnologia (paginação opcional)
export async function fetchTechNews(page = 1): Promise<ArticleSummary[]> {
  const { data } = await api.get<ArticleSummary[]>("/articles", {
    params: { tag: "technology", per_page: 20, page },
  });
  return data;
}

// Detalhe por id
export async function fetchArticleById(id: number): Promise<ArticleDetails> {
  const { data } = await api.get<ArticleDetails>(`/articles/${id}`);
  return data;
}
