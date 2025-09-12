// src/app/index.tsx
import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Linking,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
  Keyboard,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import type { ArticleSummary, ArticleDetails } from "../server/api";
import { fetchTechNews, fetchArticleById } from "../server/api";
import { getFavorites, saveFavorite, deleteFavorite } from "../server/favorites";

const PLACEHOLDER =
  "https://placehold.co/800x400/png?text=FIAP+Tech+News&font=roboto";

type Tab = "feed" | "favorites";

export default function App() {
  const [tab, setTab] = useState<Tab>("feed");

  // Feed + busca por tópicos
  const [news, setNews] = useState<ArticleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detalhes
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<ArticleDetails | null>(null);

  // Favoritos
  const [favMap, setFavMap] = useState<Record<number, number>>({});
  const [favArticles, setFavArticles] = useState<ArticleSummary[]>([]);

  /* ==== Feed ==== */
  const loadNews = useCallback(
    async (p = 1, replace = false, t: string[] = topics) => {
      try {
        setError(null);
        const data = await fetchTechNews(p, t);
        setNews((prev) => (replace ? data : [...prev, ...data]));
      } catch {
        setError("Falha ao carregar notícias. Puxe para atualizar.");
      } finally {
        setRefreshing(false);
      }
    },
    [topics]
  );

  useEffect(() => {
    // primeira carga: default "technology"
    loadNews(1, true, []);
    refreshFavorites();
  }, [loadNews]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadNews(1, true);
    await refreshFavorites();
  };

  const onEndReached = async () => {
    const next = page + 1;
    setPage(next);
    await loadNews(next);
  };

  // Busca
  const onSubmitSearch = async () => {
    const parsed = query
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    setTopics(parsed);
    setPage(1);
    Keyboard.dismiss();
    await loadNews(1, true, parsed);
  };

  const clearSearch = async () => {
    setQuery("");
    setTopics([]);
    setPage(1);
    await loadNews(1, true, []);
  };

  const activeFilterLabel =
    topics.length > 0 ? `Tópicos: ${topics.join(", ")}` : "Tópico: technology";

  /* ==== Detalhes ==== */
  const openDetails = async (item: ArticleSummary) => {
    setSelected({ ...item, body_markdown: undefined });
    setVisible(true);
    try {
      const full = await fetchArticleById(item.id);
      setSelected((prev) => (prev ? { ...prev, ...full } : full));
    } catch {}
  };

  const closeDetails = () => {
    setVisible(false);
    setSelected(null);
  };

  /* ==== Favoritos ==== */
  const refreshFavorites = useCallback(async () => {
    try {
      const favs = await getFavorites(); // [{id, articleId}]
      const map: Record<number, number> = {};
      favs.forEach((f) => (map[f.articleId] = f.id));
      setFavMap(map);

      const uniqueIds = [...new Set(favs.map((f) => f.articleId))];
      if (uniqueIds.length === 0) {
        setFavArticles([]);
        return;
      }
      const articles = await Promise.all(
        uniqueIds.map((id) => fetchArticleById(id).catch(() => null))
      );
      setFavArticles(articles.filter(Boolean) as ArticleSummary[]);
    } catch {}
  }, []);

  const toggleFavorite = async (articleId: number) => {
    const favoriteId = favMap[articleId];
    try {
      if (favoriteId) {
        await deleteFavorite(favoriteId);
      } else {
        const created = await saveFavorite(articleId);
        setFavMap((prev) => ({ ...prev, [articleId]: created.id }));
      }
      await refreshFavorites();
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar favoritos.");
    }
  };

  const renderCard = (item: ArticleSummary) => {
    const isFav = Boolean(favMap[item.id]);
    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
        <Image
          source={{ uri: item.cover_image || PLACEHOLDER }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <TouchableOpacity
              style={styles.favBtn}
              onPress={() => toggleFavorite(item.id)}
            >
              <Ionicons
                name={isFav ? "star" : "star-outline"}
                size={22}
                color={isFav ? "#FFD700" : "#9aa0a6"}
              />
            </TouchableOpacity>
          </View>

          {!!item.description && (
            <Text style={styles.desc} numberOfLines={3}>
              {item.description}
            </Text>
          )}
          <Text style={styles.meta}>
            {item.user?.name ? `${item.user.name} • ` : ""}
            {item.readable_publish_date}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* ==== Listas ==== */
  const FeedList = (
    <>
      {/* Barra de busca por tópicos */}
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquise por tópicos - ex: AI, javascript"
          placeholderTextColor="#8a8f98"
          returnKeyType="search"
          onSubmitEditing={onSubmitSearch}
          style={styles.searchInput}
        />
        {query.length > 0 ? (
          <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}>
            <Feather name="x-circle" size={20} color="#c7c9cc" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.searchBtn} onPress={onSubmitSearch}>
            <Feather name="search" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.filterHint}>{activeFilterLabel}</Text>

      <FlatList
        data={news}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => renderCard(item)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReachedThreshold={0.25}
        onEndReached={onEndReached}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Sem notícias para esse(s) tópico(s). Tente outra busca.
            </Text>
          </View>
        }
      />
    </>
  );

  const FavoritesList = (
    <FlatList
      data={favArticles}
      keyExtractor={(item) => `fav-${item.id}`}
      renderItem={({ item }) => renderCard(item)}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Você ainda não favoritou nada. Toque na estrela para salvar.
          </Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refreshFavorites();
            setRefreshing(false);
          }}
        />
      }
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>FIAP • Tech News</Text>

      {/* Toggle de abas */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "feed" && styles.tabBtnActive]}
          onPress={() => setTab("feed")}
        >
          <Ionicons
            name="newspaper-outline"
            size={18}
            color={tab === "feed" ? "#fff" : "#c7c9cc"}
          />
          <Text style={[styles.tabText, tab === "feed" && styles.tabTextActive]}>
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "favorites" && styles.tabBtnActive]}
          onPress={async () => {
            setTab("favorites");
            await refreshFavorites();
          }}
        >
          <Ionicons
            name={tab === "favorites" ? "heart" : "heart-outline"}
            size={18}
            color={tab === "favorites" ? "#fff" : "#c7c9cc"}
          />
          <Text
            style={[
              styles.tabText,
              tab === "favorites" && styles.tabTextActive,
            ]}
          >
            Minhas Favoritas
          </Text>
        </TouchableOpacity>
      </View>

      {error && tab === "feed" && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {tab === "feed" ? FeedList : FavoritesList}

      {/* Modal de detalhes */}
      <Modal visible={visible} animationType="slide" onRequestClose={closeDetails}>
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {selected && (
              <>
                <Image
                  source={{ uri: selected.cover_image || PLACEHOLDER }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <Text style={styles.modalTitle}>{selected.title}</Text>
                <Text style={styles.modalMeta}>
                  {selected.user?.name ? `${selected.user.name} • ` : ""}
                  {selected.readable_publish_date}
                </Text>

                <Text style={styles.modalBody}>
                  {selected.body_markdown?.trim() ||
                    selected.description?.trim() ||
                    "Sem descrição disponível."}
                </Text>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => Linking.openURL(selected.url)}
                >
                  <Text style={styles.primaryBtnText}>Ler no site</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={closeDetails}>
                  <Text style={styles.secondaryBtnText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0c" },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141518",
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#232427",
  },
  tabBtnActive: {
    backgroundColor: "#e11d48",
    borderColor: "#e11d48",
  },
  tabText: { color: "#c7c9cc", fontWeight: "700" },
  tabTextActive: { color: "#fff" },

  // Busca
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#141518",
    color: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232427",
  },
  searchBtn: {
    backgroundColor: "#e11d48",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearBtn: {
    backgroundColor: "#232427",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterHint: {
    color: "#9aa0a6",
    paddingHorizontal: 16,
    marginBottom: 6,
    fontSize: 12,
  },

  listContent: { paddingHorizontal: 12, paddingBottom: 20 },

  card: {
    backgroundColor: "#16171a",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232427",
  },
  image: { width: "100%", height: 180, backgroundColor: "#101113" },
  cardBody: { padding: 12, gap: 6 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  favBtn: { paddingLeft: 8 },

  title: { fontSize: 16, fontWeight: "700", color: "#fff", flex: 1 },
  desc: { fontSize: 14, color: "#c7c9cc" },
  meta: { fontSize: 12, color: "#9aa0a6" },

  errorBox: {
    backgroundColor: "#2a1b1b",
    borderColor: "#5f3333",
    borderWidth: 1,
    padding: 10,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: { color: "#ffb3b3", textAlign: "center" },

  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { color: "#c7c9cc" },

  modalContainer: { flex: 1, backgroundColor: "#0b0b0c" },
  modalContent: { padding: 16, gap: 12 },
  modalImage: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#101113" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  modalMeta: { fontSize: 12, color: "#9aa0a6" },
  modalBody: { fontSize: 15, color: "#dfe1e6", lineHeight: 22 },

  primaryBtn: {
    backgroundColor: "#e11d48",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: "#232427",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryBtnText: { color: "#c7c9cc", fontWeight: "700" },
});
