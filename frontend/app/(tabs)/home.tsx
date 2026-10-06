import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "@/src/components/AppHeader";
import { api, Book } from "@/src/lib/api";
import { colors, font, radius, spacing, touchTarget } from "@/src/theme";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [scanSheetOpen, setScanSheetOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.listBooks();
      setBooks(list);
      setErr(null);
    } catch (e: any) {
      setErr(e?.detail || "Errore caricamento");
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const buzz = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); };

  const pickAndUpload = async () => {
    buzz();
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/epub+zip", "application/octet-stream"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const name = asset.name || "libro";
      const ext = name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "epub") {
        setErr("Formato non supportato. Usa PDF o EPUB.");
        return;
      }
      setUploading(true);
      setErr(null);
      const mime = ext === "pdf" ? "application/pdf" : "application/epub+zip";
      await api.uploadBook(asset.uri, name, mime);
      await load();
    } catch (e: any) {
      setErr(e?.detail || "Errore durante il caricamento");
    } finally {
      setUploading(false);
    }
  };

  const scanPages = async (source: "camera" | "library") => {
    buzz();
    setErr(null);
    try {
      let pages: { uri: string; name: string }[] = [];
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { setErr("Permesso fotocamera negato"); return; }
        // capture pages one by one
        while (true) {
          const shot = await ImagePicker.launchCameraAsync({
            quality: 0.85,
            allowsEditing: false,
            mediaTypes: ["images"] as any,
          });
          if (shot.canceled || !shot.assets?.length) break;
          const a = shot.assets[0];
          pages.push({ uri: a.uri, name: `page_${pages.length + 1}.jpg` });
          // ask if continue via simple: only 1 page at a time — user reopens for more
          break;
        }
        if (pages.length === 0) return;
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { setErr("Permesso galleria negato"); return; }
        const res = await ImagePicker.launchImageLibraryAsync({
          allowsMultipleSelection: true,
          selectionLimit: 50,
          quality: 0.85,
          mediaTypes: ["images"] as any,
        });
        if (res.canceled || !res.assets?.length) return;
        pages = res.assets.map((a, i) => ({ uri: a.uri, name: a.fileName || `page_${i + 1}.jpg` }));
      }
      const title = `Scansione ${new Date().toLocaleDateString("it-IT")}`;
      setScanSheetOpen(false);
      setUploading(true);
      await api.scanBook(pages, title);
      await load();
    } catch (e: any) {
      setErr(e?.detail || "Errore durante la scansione");
    } finally {
      setUploading(false);
      setScanSheetOpen(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return books;
    const q = query.toLowerCase();
    return books.filter((b) => b.title.toLowerCase().includes(q));
  }, [books, query]);

  const openBook = (b: Book) => {
    buzz();
    router.push({ pathname: "/reader/[id]", params: { id: b.book_id, title: b.title } });
  };

  return (
    <View style={styles.root} testID="home-screen">
      <AppHeader onSearch={setQuery} />

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.book_id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.sm }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <View style={styles.ctaRow}>
              <Pressable
                testID="home-upload-button"
                style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}
                onPress={pickAndUpload}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel="Carica un libro PDF o EPUB"
              >
                {uploading ? (
                  <ActivityIndicator color={colors.onSurface} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={36} color={colors.onSurface} />
                    <Text style={styles.ctaText}>Carica File</Text>
                    <Text style={styles.ctaSub}>PDF · EPUB</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                testID="home-scan-button"
                style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}
                onPress={() => { buzz(); setScanSheetOpen(true); }}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel="Scansiona le pagine di un libro"
              >
                <Ionicons name="scan" size={36} color={colors.onSurface} />
                <Text style={styles.ctaText}>Scansiona</Text>
                <Text style={styles.ctaSub}>Foto pagine</Text>
              </Pressable>
            </View>

            {uploading ? (
              <Text style={styles.uploadSub} testID="home-upload-status" accessibilityLiveRegion="polite">
                Caricamento in corso… la lettura delle pagine con l&apos;AI richiede qualche secondo per pagina.
              </Text>
            ) : null}

            {err ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite" testID="home-error">
                <Ionicons name="alert-circle" size={24} color={colors.onError} />
                <Text style={styles.errorText}>{err}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle} accessibilityRole="header">
              I tuoi libri {books.length ? `(${books.length})` : ""}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          ) : (
            <View style={styles.centerBox} testID="home-empty">
              <Ionicons name="book-outline" size={64} color={colors.muted} />
              <Text style={styles.emptyText}>Nessun libro caricato</Text>
              <Text style={styles.emptySub}>Premi Carica File o Scansiona per iniziare</Text>
            </View>
          )
        }
        renderItem={({ item }) => <BookRow book={item} onPress={() => openBook(item)} onDeleted={load} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      />

      {/* Scan source picker */}
      <Modal visible={scanSheetOpen} animationType="slide" transparent onRequestClose={() => setScanSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setScanSheetOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]} onPress={(e) => e.stopPropagation()} testID="scan-sheet">
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>Scansiona pagine</Text>
            <Text style={styles.sheetSub}>Le pagine saranno lette dall&apos;AI</Text>
            <Pressable
              testID="scan-camera-option"
              style={({ pressed }) => [styles.sheetItem, pressed && styles.pressed]}
              onPress={() => scanPages("camera")}
              accessibilityRole="button"
              accessibilityLabel="Scatta foto della pagina con la fotocamera"
            >
              <Ionicons name="camera" size={32} color={colors.onSurface} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetItemText}>Da fotocamera</Text>
                <Text style={styles.sheetItemSub}>Scatta una pagina</Text>
              </View>
              <Ionicons name="chevron-forward" size={26} color={colors.onSurface} />
            </Pressable>
            <Pressable
              testID="scan-library-option"
              style={({ pressed }) => [styles.sheetItem, pressed && styles.pressed]}
              onPress={() => scanPages("library")}
              accessibilityRole="button"
              accessibilityLabel="Scegli più foto dalla galleria"
            >
              <Ionicons name="images" size={32} color={colors.onSurface} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetItemText}>Dalla galleria</Text>
                <Text style={styles.sheetItemSub}>Seleziona più pagine</Text>
              </View>
              <Ionicons name="chevron-forward" size={26} color={colors.onSurface} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function BookRow({ book, onPress, onDeleted }: { book: Book; onPress: () => void; onDeleted?: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const del = async () => {
    setDeleting(true);
    try {
      await api.deleteBook(book.book_id);
      onDeleted?.();
    } catch {} finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <View style={styles.bookRow}>
      <Pressable
        testID={`book-row-${book.book_id}`}
        style={({ pressed }) => [styles.bookMain, pressed && { opacity: 0.7 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Apri libro: ${book.title}, ${book.file_type.toUpperCase()}, ${book.pages} pagine`}
      >
        <View style={styles.bookIcon}>
          <Ionicons name={book.file_type === "pdf" ? "document-text" : "book"} size={36} color={colors.onBrand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
          <Text style={styles.bookMeta}>{book.file_type.toUpperCase()} · {book.pages} pag.</Text>
        </View>
        <Ionicons name="play-circle" size={44} color={colors.brand} />
      </Pressable>
      {confirming ? (
        <View style={styles.confirmRow}>
          <Pressable
            testID={`book-delete-confirm-${book.book_id}`}
            style={[styles.confirmBtn, { backgroundColor: colors.error }]}
            onPress={del}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Conferma eliminazione"
          >
            {deleting ? <ActivityIndicator color={colors.onError} /> : <Text style={styles.confirmText}>Elimina</Text>}
          </Pressable>
          <Pressable
            style={[styles.confirmBtn, { backgroundColor: colors.surfaceTertiary }]}
            onPress={() => setConfirming(false)}
            accessibilityRole="button"
            accessibilityLabel="Annulla"
          >
            <Text style={styles.confirmText}>Annulla</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          testID={`book-delete-${book.book_id}`}
          style={styles.deleteBtn}
          onPress={() => setConfirming(true)}
          accessibilityRole="button"
          accessibilityLabel={`Elimina libro ${book.title}`}
          hitSlop={12}
        >
          <Ionicons name="trash" size={22} color={colors.error} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "transparent",
    minHeight: 96,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.onSurface,
  },
  uploadText: { color: colors.onSurface, fontSize: font.lg, fontWeight: "900" },
  uploadSub: { color: colors.muted, fontSize: font.sm, fontWeight: "600" },
  ctaRow: { flexDirection: "row", gap: spacing.sm },
  ctaBtn: {
    flex: 1,
    minHeight: 120,
    borderRadius: radius.md,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.onSurface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: spacing.sm,
  },
  ctaText: { color: colors.onSurface, fontSize: font.base, fontWeight: "900" },
  ctaSub: { color: colors.muted, fontSize: font.sm, fontWeight: "600" },
  pressed: { opacity: 0.7 },
  sectionTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "900" },
  centerBox: { alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg },
  emptyText: { color: colors.onSurface, fontSize: font.base, fontWeight: "700" },
  emptySub: { color: colors.muted, fontSize: font.sm, textAlign: "center" },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: touchTarget.min,
    paddingRight: spacing.sm,
  },
  bookMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    minHeight: touchTarget.min,
  },
  bookIcon: {
    width: 56, height: 56, borderRadius: radius.md,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
  },
  bookTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: "800" },
  bookMeta: { color: colors.muted, fontSize: font.sm, fontWeight: "600", marginTop: 2 },
  deleteBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  confirmRow: { flexDirection: "row", gap: spacing.xs, paddingVertical: spacing.xs, paddingRight: spacing.xs },
  confirmBtn: { minHeight: 48, paddingHorizontal: spacing.sm, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  confirmText: { color: colors.onSurface, fontSize: font.sm, fontWeight: "800" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.error, padding: spacing.sm, borderRadius: radius.md,
  },
  errorText: { color: colors.onError, fontSize: font.sm, fontWeight: "700", flex: 1 },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.md, gap: spacing.sm,
    borderTopWidth: 2, borderColor: colors.onSurface,
  },
  sheetGrabber: { width: 48, height: 5, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignSelf: "center" },
  sheetTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "900" },
  sheetSub: { color: colors.muted, fontSize: font.sm },
  sheetItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    minHeight: touchTarget.min, paddingHorizontal: spacing.sm,
    backgroundColor: "transparent",
    borderWidth: 2, borderColor: colors.onSurface, borderRadius: radius.md,
  },
  sheetItemText: { color: colors.onSurface, fontSize: font.base, fontWeight: "800" },
  sheetItemSub: { color: colors.muted, fontSize: font.sm, marginTop: 2 },
});
