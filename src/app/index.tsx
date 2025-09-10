import React, { useEffect, useState, useCallback } from "react";
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
} from "react-native";
import type { ArticleSummary, ArticleDetails } from "../server/api";
import { fetchTechNews, fetchArticleById } from "../server/api";

const PLACEHOLDER =
  "https://placehold.co/800x400/png?text=FIAP+Tech+News&font=roboto";

export default function App() {
  const [news, setNews] = useState<ArticleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detalhes
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<ArticleDetails | null>(null);

  const loadNews = useCallback(async (p = 1, replace = false) => {
    try {
      setError(null);
      const data = await fetchTechNews(p);
      setNews((prev) => (replace ? data : [...prev, ...data]));
    } catch {
      setError("Falha ao carregar notícias. Puxe para atualizar.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNews(1, true);
  }, [loadNews]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadNews(1, true);
  };

  const onEndReached = async () => {
    // paginação simples
    const next = page + 1;
    setPage(next);
    await loadNews(next);
  };

  const openDetails = async (item: ArticleSummary) => {
    // abre o modal imediatamente com os dados já existentes
    setSelected({
      ...item,
      body_markdown: undefined,
    });
    setVisible(true);

    // busca o corpo completo
    try {
      const full = await fetchArticleById(item.id);
      setSelected((prev) => (prev ? { ...prev, ...full } : full));
    } catch {
      // mantém apenas título/descrição já exibidos
    }
  };

  const closeDetails = () => {
    setVisible(false);
    setSelected(null);
  };

  const renderItem = ({ item }: { item: ArticleSummary }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
      <Image
        source={{ uri: item.cover_image || PLACEHOLDER }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>FIAP • Tech News</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={news}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReachedThreshold={0.25}
        onEndReached={onEndReached}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Sem notícias no momento. Puxe para atualizar.
            </Text>
          </View>
        }
      />

      {/* Modal de detalhes (abre sem spinner) */}
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
    color: "#E6007E",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  title: { fontSize: 16, fontWeight: "700", color: "#E6007E" },
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
    backgroundColor: "#E6007E",
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
