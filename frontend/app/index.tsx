import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/src/lib/auth";
import { colors, font, radius, spacing, touchTarget } from "@/src/theme";

export default function Splash() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
    AccessibilityInfo.announceForAccessibility?.("Leggimi, la tua libreria accessibile");
  }, [fade, scale]);

  const go = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (!loading && user) router.replace("/(tabs)/home");
    else router.replace("/auth/login");
  };

  return (
    <View style={styles.root} testID="splash-screen">
      <Animated.View style={[styles.center, { opacity: fade, transform: [{ scale }] }]}>
        <View
          style={styles.logoRing}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Logo Leggimi"
        >
          <Ionicons name="book" size={72} color={colors.onBrand} />
        </View>
        <Text style={styles.title} accessibilityRole="header" testID="splash-title">
          Leggimi
        </Text>
        <Text style={styles.subtitle}>La tua libreria accessibile</Text>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          testID="splash-start-button"
          style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
          onPress={go}
          accessibilityRole="button"
          accessibilityLabel="Inizia"
        >
          <Text style={styles.startText}>Inizia</Text>
          <Ionicons name="arrow-forward" size={22} color={colors.onBrand} />
        </Pressable>
        <Text style={styles.hint}>PDF ed EPUB con voce integrata</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    flex: 1,
    paddingTop: spacing.xl,
  },
  logoRing: {
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.onSurface,
  },
  title: { color: colors.brand, fontSize: font.xxl, fontWeight: "900", letterSpacing: 1 },
  subtitle: {
    color: colors.onSurface,
    fontSize: font.base,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    gap: spacing.sm,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand,
    minHeight: touchTarget.min,
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.onSurface,
    paddingHorizontal: spacing.md,
  },
  startText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "900" },
  pressed: { opacity: 0.7 },
  hint: { color: colors.muted, fontSize: font.sm, fontWeight: "600" },
});
