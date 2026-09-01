import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AppHeader from "@/src/components/AppHeader";
import { useTts } from "@/src/lib/tts";
import { colors, font, radius, spacing, touchTarget } from "@/src/theme";

const SAMPLE = "Benvenuto in Leggimi. Questa è una prova della voce di lettura.";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, update } = useTts();
  const [testing, setTesting] = useState(false);

  const test = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Speech.stop();
    setTesting(true);
    Speech.speak(SAMPLE, {
      language: "it-IT",
      rate: settings.rate,
      pitch: settings.pitch,
      onDone: () => setTesting(false),
      onStopped: () => setTesting(false),
      onError: () => setTesting(false),
    });
  };

  const stop = () => { Speech.stop(); setTesting(false); };

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
          onPress={testing ? stop : test}
          accessibilityRole="button"
          accessibilityLabel={testing ? "Ferma prova voce" : "Prova voce"}
        >
          <Ionicons name={testing ? "stop" : "play"} size={36} color={colors.onBrand} />
          <Text style={styles.testText}>{testing ? "Ferma" : "Prova voce"}</Text>
        </Pressable>

        <View style={styles.info}>
          <Ionicons name="information-circle" size={24} color={colors.brand} />
          <Text style={styles.infoText}>
            La voce utilizzata è quella nativa del dispositivo (italiano). Puoi cambiare voce dalle impostazioni di sistema.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { color: colors.onSurface, fontSize: font.xl, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: font.sm },
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
});
