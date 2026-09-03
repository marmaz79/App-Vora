import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AppHeader from "@/src/components/AppHeader";
import { useTts } from "@/src/lib/tts";
import { colors, font, radius, spacing, touchTarget } from "@/src/theme";

const SAMPLE = "Benvenuto in Voicebook. Questa è una prova della voce di lettura.";

type VoiceRow = { identifier: string; name: string; language: string; quality?: string };

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, update } = useTts();
  const [testing, setTesting] = useState(false);
  const [voices, setVoices] = useState<VoiceRow[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await Speech.getAvailableVoicesAsync();
        // Prefer italian voices, then rest
        const mapped: VoiceRow[] = (list || []).map((v: any) => ({
          identifier: v.identifier,
          name: v.name || v.identifier,
          language: v.language || "",
          quality: v.quality,
        }));
        const italian = mapped.filter((v) => v.language?.toLowerCase().startsWith("it"));
        const others = mapped.filter((v) => !v.language?.toLowerCase().startsWith("it"));
        setVoices([...italian, ...others]);
      } catch (e) {
        setVoices([]);
      } finally {
        setVoicesLoading(false);
      }
    })();
  }, []);

  const currentVoice = useMemo(
    () => voices.find((v) => v.identifier === settings.voice) || null,
    [voices, settings.voice]
  );

  const speak = (voiceId?: string | null) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Speech.stop();
    setTesting(true);
    Speech.speak(SAMPLE, {
      language: "it-IT",
      rate: settings.rate,
      pitch: settings.pitch,
      voice: voiceId || settings.voice || undefined,
      onDone: () => setTesting(false),
      onStopped: () => setTesting(false),
      onError: () => setTesting(false),
    });
  };

  const stop = () => { Speech.stop(); setTesting(false); };

  const pickVoice = async (v: VoiceRow | null) => {
    await update({ voice: v?.identifier || null });
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    // preview
    Speech.stop();
    Speech.speak(SAMPLE, {
      language: "it-IT",
      rate: settings.rate,
      pitch: settings.pitch,
      voice: v?.identifier || undefined,
    });
    setVoicePickerOpen(false);
  };

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
            <Text style={styles.subtitle}>Personalizza il TTS del dispositivo</Text>
          </View>
        </View>

        {/* Voice selector */}
        <Pressable
          testID="settings-voice-selector"
          style={({ pressed }) => [styles.voiceRow, pressed && { opacity: 0.7 }]}
          onPress={() => setVoicePickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Scegli voce di lettura"
        >
          <Ionicons name="person-circle" size={36} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.voiceLabel}>Voce</Text>
            <Text style={styles.voiceValue} numberOfLines={1}>
              {voicesLoading ? "Caricamento…" : currentVoice ? `${currentVoice.name} (${currentVoice.language})` : "Voce di sistema"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={28} color={colors.onSurface} />
        </Pressable>

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
                testID={`settings-rate-preset-${r}`}
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

        {/* Pitch */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tono</Text>
            <Text style={styles.value} testID="settings-pitch-value">{settings.pitch.toFixed(2)}</Text>
          </View>
          <Slider
            testID="settings-pitch-slider"
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={1.5}
            step={0.05}
            value={settings.pitch}
            onSlidingComplete={(v) => update({ pitch: Math.round(v * 100) / 100 })}
            minimumTrackTintColor={colors.brand}
            maximumTrackTintColor={colors.surfaceTertiary}
            thumbTintColor={colors.brand}
            accessibilityLabel="Tono di lettura"
          />
        </View>

        {/* Test */}
        <Pressable
          testID="settings-test-button"
          style={({ pressed }) => [styles.testBtn, pressed && { opacity: 0.7 }]}
          onPress={testing ? stop : () => speak()}
          accessibilityRole="button"
          accessibilityLabel={testing ? "Ferma prova voce" : "Prova voce"}
        >
          <Ionicons name={testing ? "stop" : "play"} size={36} color={colors.onBrand} />
          <Text style={styles.testText}>{testing ? "Ferma" : "Prova voce"}</Text>
        </Pressable>

        <View style={styles.info}>
          <Ionicons name="information-circle" size={24} color={colors.brand} />
          <Text style={styles.infoText}>
            Le voci disponibili sono quelle installate sul dispositivo. Puoi aggiungerne altre dalle impostazioni di sistema.
          </Text>
        </View>
      </ScrollView>

      {/* Voice picker modal */}
      <Modal visible={voicePickerOpen} animationType="slide" transparent onRequestClose={() => setVoicePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.md, paddingTop: spacing.sm }]} testID="voice-picker">
            <View style={styles.sheetGrabber} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Scegli la voce</Text>
              <Pressable
                testID="voice-picker-close"
                onPress={() => setVoicePickerOpen(false)}
                style={styles.iconBtn}
                accessibilityLabel="Chiudi selezione voce"
              >
                <Ionicons name="close" size={28} color={colors.onSurface} />
              </Pressable>
            </View>
            {voicesLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.brand} />
              </View>
            ) : voices.length === 0 ? (
              <Text style={styles.emptyText}>Nessuna voce disponibile sul dispositivo.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 480 }}>
                <Pressable
                  testID="voice-option-system"
                  style={({ pressed }) => [styles.voiceOption, !settings.voice && styles.voiceOptionActive, pressed && { opacity: 0.7 }]}
                  onPress={() => pickVoice(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Voce di sistema"
                >
                  <Ionicons name={!settings.voice ? "radio-button-on" : "radio-button-off"} size={26} color={colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voiceName}>Voce di sistema</Text>
                    <Text style={styles.voiceLang}>Predefinita</Text>
                  </View>
                </Pressable>
                {voices.map((v) => {
                  const active = settings.voice === v.identifier;
                  return (
                    <Pressable
                      key={v.identifier}
                      testID={`voice-option-${v.identifier}`}
                      style={({ pressed }) => [styles.voiceOption, active && styles.voiceOptionActive, pressed && { opacity: 0.7 }]}
                      onPress={() => pickVoice(v)}
                      accessibilityRole="button"
                      accessibilityLabel={`Voce ${v.name}, lingua ${v.language}`}
                    >
                      <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={26} color={colors.brand} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.voiceName} numberOfLines={1}>{v.name}</Text>
                        <Text style={styles.voiceLang}>{v.language}{v.quality ? ` · ${v.quality}` : ""}</Text>
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={24} color={colors.brand} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
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
