import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "@/src/components/AppHeader";
import { api, Book } from "@/src/lib/api";
import { colors, font, spacing } from "@/src/theme";
import { BookRow } from "./home";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try { setBooks(await api.listBooks()); } catch {}
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return books;
    const q = query.toLowerCase();
    return books.filter((b) => b.title.toLowerCase().includes(q));
  }, [books, query]);

  return (
    <View style={styles.root} testID="library-screen">
      <AppHeader onSearch={setQuery} title="Libreria" />
      <FlatList
        data={filtered}
        keyExtractor={(b) => b.book_id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.sm }}
        ListHeaderComponent={
          <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
            <Text style={styles.title} accessibilityRole="header">La tua libreria</Text>
            <Text style={styles.subtitle}>
              {books.length ? `${books.length} libri disponibili` : "Nessun libro"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          ) : (
            <View style={styles.center} testID="library-empty">
              <Ionicons name="library-outline" size={72} color={colors.muted} />
              <Text style={styles.emptyText}>La libreria è vuota</Text>
              <Text style={styles.emptySub}>Vai in Home per caricare un libro</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <BookRow
            book={item}
            onPress={() => router.push({ pathname: "/reader/[id]", params: { id: item.book_id, title: item.title } })}
            onDeleted={load}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brand} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: { color: colors.onSurface, fontSize: font.xl, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: font.sm, fontWeight: "600" },
  center: { alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg },
  emptyText: { color: colors.onSurface, fontSize: font.base, fontWeight: "700" },
  emptySub: { color: colors.muted, fontSize: font.sm, textAlign: "center" },
});
