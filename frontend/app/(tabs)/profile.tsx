import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AppHeader from "@/src/components/AppHeader";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, font, radius, spacing, touchTarget } from "@/src/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try { const list = await api.listBooks(); setCount(list.length); } catch {}
    })();
  }, []);

  const doLogout = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    await logout();
    router.replace("/auth/login");
  };

  return (
    <View style={styles.root} testID="profile-screen">
      <AppHeader showSearch={false} title="Profilo" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
      >
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "?").slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.name} accessibilityRole="header">{user?.name || "Utente"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.badge}>
            <Ionicons name={user?.auth_provider === "google" ? "logo-google" : "mail"} size={20} color={colors.onBrand} />
            <Text style={styles.badgeText}>
              {user?.auth_provider === "google" ? "Account Google" : "Account Email"}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="library" size={32} color={colors.brand} />
            <Text style={styles.statValue}>{count ?? "-"}</Text>
            <Text style={styles.statLabel}>Libri</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="volume-high" size={32} color={colors.brand} />
            <Text style={styles.statValue}>TTS</Text>
            <Text style={styles.statLabel}>Attivo</Text>
          </View>
        </View>

        <Pressable
          testID="profile-settings-button"
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/(tabs)/settings")}
          accessibilityRole="button"
          accessibilityLabel="Vai alle impostazioni"
        >
          <Ionicons name="settings" size={32} color={colors.brand} />
          <Text style={styles.itemText}>Impostazioni TTS</Text>
          <Ionicons name="chevron-forward" size={28} color={colors.onSurface} />
        </Pressable>

        <Pressable
          testID="profile-library-button"
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/(tabs)/library")}
          accessibilityRole="button"
          accessibilityLabel="Vai alla libreria"
        >
          <Ionicons name="library" size={32} color={colors.brand} />
          <Text style={styles.itemText}>La mia libreria</Text>
          <Ionicons name="chevron-forward" size={28} color={colors.onSurface} />
        </Pressable>

        <Pressable
          testID="profile-logout-button"
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
          onPress={doLogout}
          accessibilityRole="button"
          accessibilityLabel="Esci dall'account"
        >
          <Ionicons name="log-out-outline" size={32} color={colors.onError} />
          <Text style={styles.logoutText}>Esci</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: colors.onSurface,
  },
  avatarText: { color: colors.onBrand, fontSize: 44, fontWeight: "900" },
  name: { color: colors.onSurface, fontSize: font.xl, fontWeight: "900" },
  email: { color: colors.muted, fontSize: font.sm },
  badge: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.brand, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.onBrand, fontSize: font.sm, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1, backgroundColor: colors.surfaceSecondary, padding: spacing.md,
    borderRadius: radius.md, alignItems: "center", gap: 4,
    borderWidth: 2, borderColor: colors.border,
  },
  statValue: { color: colors.onSurface, fontSize: font.xl, fontWeight: "900" },
  statLabel: { color: colors.muted, fontSize: font.sm, fontWeight: "700" },
  item: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, minHeight: touchTarget.min,
    borderWidth: 2, borderColor: colors.border,
  },
  itemText: { color: colors.onSurface, fontSize: font.base, fontWeight: "700", flex: 1 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.error, minHeight: touchTarget.min,
    borderRadius: radius.md, borderWidth: 2, borderColor: colors.onSurface,
    marginTop: spacing.sm,
  },
  logoutText: { color: colors.onError, fontSize: font.lg, fontWeight: "900" },
});
