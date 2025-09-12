// src/server/favorites.ts
import axios from "axios";

/** Backend local (JSON Server) para favoritos */
const appApi = axios.create({
  baseURL: "http://localhost:8081", // json-server --watch db.json --port 8081
  timeout: 10000,
});

export type Favorite = {
  id: number;        // id do favorito no JSON Server
  articleId: number; // id do artigo (DEV.to)
};

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
