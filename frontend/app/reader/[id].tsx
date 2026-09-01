import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, BookContent } from "@/src/lib/api";
import { useTts } from "@/src/lib/tts";
import { colors, font, radius, spacing, touchTarget } from "@/src/theme";

export default function ReaderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { settings } = useTts();
  const [content, setContent] = useState<BookContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const stoppedManually = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const buzz = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); };

  useEffect(() => {
    (async () => {
      try {
        const c = await api.getContent(String(id));
        // filter out empty pages
        const nonEmpty = c.pages.map((p) => p.trim()).filter((p) => p.length > 0);
        setContent({ ...c, pages: nonEmpty.length ? nonEmpty : ["(Nessun testo estratto da questo libro.)"] });
      } catch (e: any) {
        setErr(e?.detail || "Impossibile caricare il libro");
      } finally {
        setLoading(false);
      }
    })();
    return () => { Speech.stop(); };
  }, [id]);

  const stop = useCallback(() => {
    stoppedManually.current = true;
    Speech.stop();
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  const speakPage = useCallback((idx: number) => {
    if (!content) return;
    const text = content.pages[idx];
    if (!text) return;
    stoppedManually.current = false;
    speakingRef.current = true;
    setSpeaking(true);
    Speech.stop();
    Speech.speak(text, {
      language: "it-IT",
      rate: settings.rate,
      pitch: settings.pitch,
      voice: settings.voice || undefined,
      onDone: () => {
        speakingRef.current = false;
        setSpeaking(false);
        if (stoppedManually.current) return;
        // auto-advance
        if (content && idx + 1 < content.pages.length) {
          setPageIdx((p) => {
            const next = p + 1;
            setTimeout(() => speakPage(next), 200);
            return next;
          });
        }
      },
      onStopped: () => { speakingRef.current = false; setSpeaking(false); },
      onError: () => { speakingRef.current = false; setSpeaking(false); },
    });
  }, [content, settings.rate, settings.pitch]);

  const togglePlay = () => {
    buzz();
    if (speaking) {
      stop();
    } else {
      speakPage(pageIdx);
    }
  };

  const goPrev = () => {
    buzz();
    stop();
    const next = Math.max(0, pageIdx - 1);
    setPageIdx(next);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const goNext = () => {
    buzz();
    stop();
    if (!content) return;
    const next = Math.min(content.pages.length - 1, pageIdx + 1);
    setPageIdx(next);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={styles.root} testID="reader-screen">
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          testID="reader-back-button"
          onPress={() => { stop(); router.back(); }}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Torna indietro"
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={32} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
          {content?.title || title || "Libro"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Caricamento libro…</Text>
        </View>
      ) : err ? (
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorText} testID="reader-error">{err}</Text>
        </View>
      ) : (
        <>
          {/* Page counter */}
          <View style={styles.pageBar}>
            <Text style={styles.pageInfo} testID="reader-page-info">
              Pagina {pageIdx + 1} di {content?.pages.length || 0}
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.body}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 260 }}
          >
            <Text
              style={styles.pageText}
              selectable
              accessibilityLabel={`Testo pagina ${pageIdx + 1}`}
              testID="reader-page-text"
            >
              {content?.pages[pageIdx] || ""}
            </Text>
          </ScrollView>

          {/* Sticky TTS controls */}
          <View
            style={[styles.controls, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.sm }]}
            testID="reader-controls"
          >
            <View style={styles.controlsRow}>
              <Pressable
                testID="reader-prev-button"
                style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed, pageIdx === 0 && styles.disabled]}
                onPress={goPrev}
                disabled={pageIdx === 0}
                accessibilityRole="button"
                accessibilityLabel="Pagina precedente"
              >
                <Ionicons name="play-skip-back" size={38} color={colors.onSurface} />
              </Pressable>

              <Pressable
                testID="reader-play-button"
                style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}
                onPress={togglePlay}
                accessibilityRole="button"
                accessibilityLabel={speaking ? "Pausa lettura" : "Avvia lettura"}
              >
                <Ionicons name={speaking ? "pause" : "play"} size={64} color={colors.onBrand} />
              </Pressable>

              <Pressable
                testID="reader-next-button"
                style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed, pageIdx >= (content?.pages.length || 1) - 1 && styles.disabled]}
                onPress={goNext}
                disabled={pageIdx >= (content?.pages.length || 1) - 1}
                accessibilityRole="button"
                accessibilityLabel="Pagina successiva"
              >
                <Ionicons name="play-skip-forward" size={38} color={colors.onSurface} />
              </Pressable>
            </View>
            <Text style={styles.speedHint}>Velocità: {settings.rate.toFixed(2)}x · Tono: {settings.pitch.toFixed(2)}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 56, height: 56, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  title: { color: colors.onSurface, fontSize: font.lg, fontWeight: "900", flex: 1 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.md },
  loadingText: { color: colors.muted, fontSize: font.sm, fontWeight: "700" },
  errorText: { color: colors.onSurface, fontSize: font.base, fontWeight: "700", textAlign: "center" },
  pageBar: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderBottomWidth: 2, borderBottomColor: colors.border,
  },
  pageInfo: { color: colors.brand, fontSize: font.sm, fontWeight: "900" },
  body: { flex: 1 },
  pageText: {
    color: colors.onSurface, fontSize: font.base + 2, lineHeight: (font.base + 2) * 1.6, fontWeight: "500",
  },
  controls: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 3, borderTopColor: colors.brand,
    paddingHorizontal: spacing.md, paddingTop: spacing.md,
    gap: spacing.sm,
  },
  controlsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm,
  },
  sideBtn: {
    width: 84, height: 84, borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.borderStrong,
  },
  playBtn: {
    flex: 1, height: 100, borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: colors.onSurface,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  speedHint: { color: colors.muted, fontSize: font.sm, textAlign: "center", fontWeight: "700" },
});
