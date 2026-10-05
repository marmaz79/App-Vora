import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AppHeader from "@/src/components/AppHeader";
import { api } from "@/src/lib/api";
import { useTts } from "@/src/lib/tts";
import { ensureAudioMode, getPlayer, NATURAL_VOICES, playNaturalUrl, stopNatural } from "@/src/lib/naturalVoice";
import { colors, font, radius, spacing, touchTarget } from "@/src/theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, update } = useTts();
  const [testing, setTesting] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  useEffect(() => {
    const sub = getPlayer().addListener("playbackStatusUpdate", (s) => {
      if (s.didJustFinish) setTesting(false);
    });
    return () => sub.remove();
  }, []);

  // stop any preview when leaving this tab
  useFocusEffect(
    useCallback(() => () => { stopNatural(); setTesting(false); }, [])
  );

  const preview = async (voice: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    stopNatural();
    setTesting(false);
    setPreviewErr(null);
    setLoadingVoice(voice);
    try {
      await ensureAudioMode();
      const { url } = await api.ttsPreview(voice);
      playNaturalUrl(url, settings.rate);
      setTesting(true);
    } catch (e: any) {
      console.warn("[voice] preview failed", e);
      setPreviewErr(e?.detail || "Anteprima non disponibile. Controlla la connessione e riprova.");
    } finally {
      setLoadingVoice(null);
    }
  };

  const pickVoice = async (voice: string) => {
    await update({ voice });
    preview(voice);
  };

  const stop = () => { stopNatural(); setTesting(false); };

  return (
    <View style={styles.root} testID="settings-screen">
      <AppHeader showSearch={false} title="Impostazioni" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
      >
        <View style={styles.header}>
          <Ionicons name="volume-high" size={44} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} accessibilityRole="header">Voce di lettura</Text>
            <Text style={styles.subtitle}>Voce naturale, letta come un audiolibro</Text>
          </View>
        </View>

        {/* Natural voice list */}
        <View style={styles.card} testID="settings-voice-list">
          <Text style={styles.cardTitle} accessibilityRole="header">Scegli la voce</Text>
          {NATURAL_VOICES.map((v) => {
            const active = settings.voice === v.id;
            return (
              <Pressable
                key={v.id}
                testID={`voice-option-${v.id}`}
                style={[styles.voiceOption, active && styles.voiceOptionActive]}
                onPress={() => pickVoice(v.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                aria-checked={active}
                accessibilityLabel={`Voce ${v.label}, ${v.desc}`}
              >
                <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={26} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.voiceName}>{v.label}</Text>
                  <Text style={styles.voiceLang}>{v.desc}</Text>
                </View>
                {loadingVoice === v.id ? <ActivityIndicator color={colors.brand} /> : null}
              </Pressable>
            );
          })}
          {previewErr ? (
            <Text style={styles.errText} testID="settings-preview-error" accessibilityLiveRegion="polite">
              {previewErr}
            </Text>
          ) : null}
        </View>

        {/* Rate */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Velocità</Text>
            <Text style={styles.value} testID="settings-rate-value">{settings.rate.toFixed(2)}x</Text>
          </View>
          <Slider
            testID="settings-rate-slider"
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={1.75}
            step={0.05}
            value={settings.rate}
            onSlidingComplete={(v) => update({ rate: Math.round(v * 100) / 100 })}
            minimumTrackTintColor={colors.brand}
            maximumTrackTintColor={colors.surfaceTertiary}
            thumbTintColor={colors.brand}
            accessibilityLabel="Velocità di lettura"
          />
          <View style={styles.rateBtns}>
            {[0.75, 1.0, 1.25, 1.5].map((r) => (
              <Pressable
                key={r}
                testID={`settings-rate-preset-${r.toFixed(2)}`}
                style={({ pressed }) => [styles.chip, settings.rate === r && styles.chipActive, pressed && { opacity: 0.7 }]}
                onPress={() => update({ rate: r })}
                accessibilityRole="button"
                accessibilityLabel={`Imposta velocità ${r}x`}
              >
                <Text style={[styles.chipText, settings.rate === r && styles.chipTextActive]}>{r}x</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Test */}
        <Pressable
          testID="settings-test-button"
          style={({ pressed }) => [styles.testBtn, pressed && { opacity: 0.7 }]}
          onPress={testing ? stop : () => preview(settings.voice)}
          disabled={!!loadingVoice}
          accessibilityRole="button"
          accessibilityLabel={testing ? "Ferma prova voce" : "Prova voce"}
        >
          <Ionicons name={testing ? "stop" : "play"} size={36} color={colors.onBrand} />
          <Text style={styles.testText}>{testing ? "Ferma" : "Prova voce"}</Text>
        </Pressable>

        <View style={styles.info}>
          <Ionicons name="information-circle" size={24} color={colors.brand} />
          <Text style={styles.infoText}>
            La voce naturale richiede internet la prima volta che ascolti una pagina. Le pagine già ascoltate vengono salvate e partono subito.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  errText: { color: colors.error, fontSize: font.sm, fontWeight: "700" },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { color: colors.onSurface, fontSize: font.xl, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: font.sm },
  voiceRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, minHeight: touchTarget.min,
    borderWidth: 2, borderColor: colors.border,
  },
  voiceLabel: { color: colors.muted, fontSize: font.sm, fontWeight: "700" },
  voiceValue: { color: colors.onSurface, fontSize: font.base, fontWeight: "800", marginTop: 2 },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 2, borderColor: colors.border, gap: spacing.sm,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: "800" },
  value: { color: colors.brand, fontSize: font.lg, fontWeight: "900" },
  slider: { width: "100%", height: 48 },
  rateBtns: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  chip: {
    minHeight: 52, minWidth: 72, paddingHorizontal: spacing.sm,
    borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.onSurface },
  chipText: { color: colors.onSurface, fontSize: font.sm, fontWeight: "800" },
  chipTextActive: { color: colors.onBrand },
  testBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.brand, minHeight: touchTarget.min, borderRadius: radius.md,
    borderWidth: 3, borderColor: colors.onSurface,
  },
  testText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "900" },
  info: { flexDirection: "row", gap: spacing.xs, padding: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  infoText: { color: colors.muted, fontSize: font.sm, flex: 1, lineHeight: 22 },
  // modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    borderTopWidth: 3,
    borderColor: colors.brand,
    gap: spacing.sm,
  },
  sheetGrabber: {
    width: 48, height: 5, borderRadius: 999, backgroundColor: colors.surfaceTertiary,
    alignSelf: "center", marginBottom: spacing.xs,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: "900" },
  iconBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  loadingBox: { padding: spacing.lg, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: font.sm, textAlign: "center", padding: spacing.md },
  voiceOption: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: radius.md, minHeight: touchTarget.min,
    borderWidth: 2, borderColor: "transparent",
    marginBottom: spacing.xs,
  },
  voiceOptionActive: { backgroundColor: colors.surface, borderColor: colors.brand },
  voiceName: { color: colors.onSurface, fontSize: font.base, fontWeight: "800" },
  voiceLang: { color: colors.muted, fontSize: font.sm, marginTop: 2 },
});
