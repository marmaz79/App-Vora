import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
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

const SPLASH_DURATION_MS = 3000;

export default function Splash() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading } = useAuth();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (!loading && user) router.replace("/(tabs)/home");
    else router.replace("/auth/login");
  };

  useEffect(() => {
    // Entry animation: fade + pop-in scale + logo rotation
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 800,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse on the logo ring
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Progress bar animation (3s)
    Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    AccessibilityInfo.announceForAccessibility?.("Leggimi, la tua libreria accessibile");

    const t = setTimeout(goNext, SPLASH_DURATION_MS);
    return () => {
      clearTimeout(t);
      pulseLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    goNext();
  };

  const rotateDeg = rotate.interpolate({ inputRange: [0, 1], outputRange: ["-25deg", "0deg"] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Pressable
      style={styles.root}
      onPress={skip}
      testID="splash-screen"
      accessibilityRole="button"
      accessibilityLabel="Tocca per continuare"
    >
      <Animated.View style={[styles.center, { opacity: fade }]}>
        <Animated.View
          style={[
            styles.logoRing,
            { transform: [{ scale: Animated.multiply(scale, pulse) }, { rotate: rotateDeg }] },
          ]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Logo Leggimi"
        >
          <Ionicons name="book" size={80} color={colors.onBrand} />
        </Animated.View>
        <Animated.Text
          style={[styles.title, { transform: [{ scale }] }]}
          accessibilityRole="header"
          testID="splash-title"
        >
          Leggimi
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleFade }]}>
          La tua libreria accessibile
        </Animated.Text>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.hint}>PDF ed EPUB con voce integrata</Text>
      </View>
    </Pressable>
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
    width: 176,
    height: 176,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.onSurface,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  title: { color: colors.brand, fontSize: 44, fontWeight: "900", letterSpacing: 2, marginTop: spacing.sm },
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
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressFill: { height: "100%", backgroundColor: colors.brand, borderRadius: radius.pill },
  hint: { color: colors.muted, fontSize: font.sm, fontWeight: "600" },
});
