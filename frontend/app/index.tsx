import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, AccessibilityInfo } from "react-native";
import { colors, font, spacing } from "@/src/theme";

export default function Splash() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
    AccessibilityInfo.announceForAccessibility?.("Leggimi, la tua libreria accessibile");
    const t = setTimeout(() => router.replace("/auth/login"), 2200);
    return () => clearTimeout(t);
  }, [fade, scale, router]);

  return (
    <View style={styles.root} testID="splash-screen">
      <Animated.View style={[styles.center, { opacity: fade, transform: [{ scale }] }]}>
        <View style={styles.logoRing} accessible accessibilityRole="image" accessibilityLabel="Logo Leggimi">
          <Ionicons name="book" size={72} color={colors.onBrand} />
        </View>
        <Text style={styles.title} accessibilityRole="header" testID="splash-title">Leggimi</Text>
        <Text style={styles.subtitle}>La tua libreria accessibile</Text>
      </Animated.View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Caricamento…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center", gap: spacing.md },
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
  title: { color: colors.brand, fontSize: 56, fontWeight: "900", letterSpacing: 1 },
  subtitle: { color: colors.onSurface, fontSize: font.base, fontWeight: "600", textAlign: "center", paddingHorizontal: spacing.md },
  footer: { position: "absolute", bottom: spacing.xl },
  footerText: { color: colors.muted, fontSize: font.sm },
});
