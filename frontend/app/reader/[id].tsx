import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
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
import { ensureAudioMode, getPlayer, playNaturalUrl, stopNatural, voiceLabel } from "@/src/lib/naturalVoice";
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
  const [generating, setGenerating] = useState(false);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const activeRef = useRef(false);
  const seqRef = useRef(0);
  const pageIdxRef = useRef(0);
  const contentRef = useRef<BookContent | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const buzz = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); };

  const [enhancing, setEnhancing] = useState(false);
  const [enhanceMsg, setEnhanceMsg] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    const c = await api.getContent(String(id));
    // filter out empty pages
    const nonEmpty = c.pages.map((p) => p.trim()).filter((p) => p.length > 0);
    const pages = nonEmpty.length ? nonEmpty : ["(Nessun testo estratto da questo libro.)"];
    setContent({ ...c, pages });
    return pages.length;
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        await loadContent();
      } catch (e: any) {
        setErr(e?.detail || "Impossibile caricare il libro");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      seqRef.current += 1;
      activeRef.current = false;
      stopNatural();
    };
  }, [id]);

  useEffect(() => { pageIdxRef.current = pageIdx; }, [pageIdx]);
  useEffect(() => { contentRef.current = content; }, [content]);

  const stop = useCallback(() => {
    seqRef.current += 1; // invalidate any in-flight request
    activeRef.current = false;
    stopNatural();
    setSpeaking(false);
    setGenerating(false);
  }, []);

  const speakPage = useCallback(async (idx: number) => {
    const c = contentRef.current;
    if (!c || !c.pages[idx]) return;
    const seq = ++seqRef.current;
    activeRef.current = true;
    setVoiceErr(null);
    setGenerating(true);
    try {
      await ensureAudioMode();
      const { url } = await api.ttsPage(String(id), idx, settings.voice);
      if (seq !== seqRef.current) return;
      playNaturalUrl(url, settings.rate);
      // prepare the next page in the background so it starts right away
      if (idx + 1 < c.pages.length) api.ttsPage(String(id), idx + 1, settings.voice).catch(() => {});
    } catch (e: any) {
      if (seq !== seqRef.current) return;
      console.warn("[voice] page audio failed", e);
      activeRef.current = false;
      setSpeaking(false);
      setVoiceErr(e?.detail || "Voce non disponibile. Controlla la connessione.");
    } finally {
      if (seq === seqRef.current) setGenerating(false);
    }
  }, [id, settings.voice, settings.rate]);

  const speakPageRef = useRef(speakPage);
  speakPageRef.current = speakPage;

  useEffect(() => {
    const sub = getPlayer().addListener("playbackStatusUpdate", (s) => {
      if (!activeRef.current) return;
      if (s.playing) setSpeaking(true);
      if (s.didJustFinish) {
        const c = contentRef.current;
        const next = pageIdxRef.current + 1;
        if (c && next < c.pages.length) {
          pageIdxRef.current = next;
          setPageIdx(next);
          scrollRef.current?.scrollTo({ y: 0, animated: true });
          speakPageRef.current(next);
        } else {
          activeRef.current = false;
          setSpeaking(false);
        }
      }
    });
    const back = BackHandler.addEventListener("hardwareBackPress", () => { stop(); return false; });
    const app = AppState.addEventListener("change", (st) => { if (st !== "active") stop(); });
    return () => { sub.remove(); back.remove(); app.remove(); };
  }, [stop]);

  const enhance = async () => {
    buzz();
    stop();
    setEnhancing(true);
    setEnhanceMsg(null);
    try {
      await api.enhanceBook(String(id));
      const count = await loadContent();
      setPageIdx((p) => Math.min(p, count - 1));
      setEnhanceMsg("Testo migliorato con l'AI.");
    } catch (e: any) {
      console.warn("[ocr] enhance failed", e);
      setEnhanceMsg(e?.detail || "Miglioramento non riuscito. Controlla la connessione e riprova.");
    } finally {
      setEnhancing(false);
    }
  };

  const togglePlay = () => {
    buzz();
    if (speaking || generating) {
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
            {content?.source === "scan" ? (
              <Pressable
                testID="reader-enhance-button"
                style={({ pressed }) => [styles.enhanceBtn, pressed && styles.pressed, enhancing && styles.disabled]}
                onPress={enhance}
                disabled={enhancing}
                accessibilityRole="button"
                accessibilityLabel={enhancing ? "Miglioramento del testo in corso" : "Migliora testo con AI"}
              >
                {enhancing ? (
                  <ActivityIndicator color={colors.onSurface} />
                ) : (
                  <Ionicons name="sparkles" size={20} color={colors.onSurface} />
                )}
                <Text style={styles.enhanceText}>
                  {enhancing ? "Miglioramento in corso…" : "Migliora testo con AI"}
                </Text>
              </Pressable>
            ) : null}
            {enhanceMsg ? (
              <Text style={styles.enhanceMsg} testID="reader-enhance-message" accessibilityLiveRegion="polite">
                {enhanceMsg}
              </Text>
            ) : null}
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
                accessibilityLabel={speaking || generating ? "Ferma lettura" : "Avvia lettura"}
              >
                {generating ? (
                  <ActivityIndicator size="large" color={colors.onBrand} />
                ) : (
                  <Ionicons name={speaking ? "pause" : "play"} size={64} color={colors.onBrand} />
                )}
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
            {voiceErr ? (
              <Pressable
                testID="reader-voice-error"
                style={styles.voiceErrBox}
                onPress={() => speakPage(pageIdx)}
                accessibilityRole="button"
                accessibilityLabel={`${voiceErr} Tocca per riprovare`}
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="refresh" size={20} color={colors.error} />
                <Text style={styles.voiceErrText}>{voiceErr} Tocca per riprovare.</Text>
              </Pressable>
            ) : (
              <Text style={styles.speedHint} testID="reader-status">
                {generating
                  ? "Preparazione voce…"
                  : `Voce: ${voiceLabel(settings.voice)} · Velocità: ${settings.rate.toFixed(2)}x`}
              </Text>
            )}
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
  enhanceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs,
    minHeight: 48, marginTop: spacing.xs, paddingHorizontal: spacing.sm,
    borderWidth: 2, borderColor: colors.onSurface, borderRadius: radius.md, backgroundColor: "transparent",
  },
  enhanceText: { color: colors.onSurface, fontSize: font.sm, fontWeight: "800" },
  enhanceMsg: { color: colors.muted, fontSize: font.sm, fontWeight: "700", marginTop: spacing.xs },
  voiceErrBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs,
    minHeight: 48, borderWidth: 2, borderColor: colors.error, borderRadius: radius.md, paddingHorizontal: spacing.sm,
  },
  voiceErrText: { color: colors.error, fontSize: font.sm, fontWeight: "700", flexShrink: 1 },
  speedHint: { color: colors.muted, fontSize: font.sm, textAlign: "center", fontWeight: "700" },
});
