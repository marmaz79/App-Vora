import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/src/lib/auth";
import { colors, font, radius, spacing, touchTarget } from "@/src/theme";

type Props = {
  onSearch?: (q: string) => void;
  showSearch?: boolean;
  title?: string;
};

export default function AppHeader({ onSearch, showSearch = true, title }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  const buzz = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const go = (path: string) => {
    setMenuOpen(false);
    buzz();
    router.push(path as any);
  };

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]} testID="app-header">
        <Pressable
          testID="header-menu-button"
          onPress={() => { buzz(); setMenuOpen(true); }}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Apri menu"
          hitSlop={12}
        >
          <Ionicons name="menu" size={36} color={colors.onSurface} />
        </Pressable>

        <View style={styles.centerBlock} accessible accessibilityRole="header" accessibilityLabel={title || "Vora"}>
          <View style={styles.brandRow}>
            <View style={styles.logoSmall}>
              <Ionicons name="book" size={20} color={colors.onSurface} />
            </View>
            <Text style={styles.brand}>{title || "Vora"}</Text>
          </View>
        </View>

        {showSearch ? (
          <Pressable
            testID="header-search-button"
            onPress={() => { buzz(); setSearchOpen(true); }}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Cerca libri"
            hitSlop={12}
          >
            <Ionicons name="search" size={32} color={colors.onSurface} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {/* Offcanvas menu */}
      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)} accessibilityLabel="Chiudi menu">
          <Pressable style={[styles.drawer, { paddingTop: insets.top + spacing.md }]} onPress={(e) => e.stopPropagation()} testID="drawer-menu">
            <View style={styles.drawerHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(user?.name || "?").slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerName} numberOfLines={1}>{user?.name || "Ospite"}</Text>
                <Text style={styles.drawerEmail} numberOfLines={1}>{user?.email || ""}</Text>
              </View>
              <Pressable
                testID="drawer-close-button"
                onPress={() => setMenuOpen(false)}
                style={styles.iconBtn}
                accessibilityLabel="Chiudi menu"
              >
                <Ionicons name="close" size={32} color={colors.onSurface} />
              </Pressable>
            </View>
            <View style={styles.drawerBody}>
              {[
                { icon: "home" as const, label: "Home", path: "/(tabs)/home" },
                { icon: "library" as const, label: "Libreria", path: "/(tabs)/library" },
                { icon: "person" as const, label: "Profilo", path: "/(tabs)/profile" },
                { icon: "settings" as const, label: "Impostazioni", path: "/(tabs)/settings" },
              ].map((it) => (
                <Pressable
                  key={it.path}
                  testID={`drawer-link-${it.label.toLowerCase()}`}
                  style={({ pressed }) => [styles.drawerItem, pressed && { backgroundColor: colors.surfaceTertiary }]}
                  onPress={() => go(it.path)}
                  accessibilityRole="link"
                  accessibilityLabel={`Vai a ${it.label}`}
                >
                  <Ionicons name={it.icon} size={32} color={colors.brand} />
                  <Text style={styles.drawerItemText}>{it.label}</Text>
                </Pressable>
              ))}
              <Pressable
                testID="drawer-logout-button"
                style={({ pressed }) => [styles.drawerItem, styles.logoutItem, pressed && { opacity: 0.7 }]}
                onPress={async () => { setMenuOpen(false); await logout(); router.replace("/auth/login"); }}
                accessibilityRole="button"
                accessibilityLabel="Esci dall'account"
              >
                <Ionicons name="log-out-outline" size={32} color={colors.error} />
                <Text style={[styles.drawerItemText, { color: colors.error }]}>Esci</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Search modal */}
      <Modal visible={searchOpen} animationType="fade" transparent onRequestClose={() => setSearchOpen(false)}>
        <View style={[styles.searchOverlay, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.searchBar} testID="search-bar">
            <Ionicons name="search" size={28} color={colors.onSurface} />
            <TextInput
              testID="search-input"
              value={q}
              onChangeText={(t) => { setQ(t); onSearch?.(t); }}
              placeholder="Cerca un libro..."
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              autoFocus
              accessibilityLabel="Campo di ricerca libri"
            />
            <Pressable
              testID="search-close-button"
              onPress={() => { setSearchOpen(false); setQ(""); onSearch?.(""); }}
              style={styles.iconBtn}
              accessibilityLabel="Chiudi ricerca"
            >
              <Ionicons name="close" size={32} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  iconBtn: {
    width: 56, height: 56, alignItems: "center", justifyContent: "center",
    borderRadius: radius.md,
  },
  centerBlock: { flex: 1, alignItems: "flex-start", justifyContent: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  logoSmall: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "transparent",
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.onSurface,
  },
  brand: { color: colors.onSurface, fontSize: font.lg, fontWeight: "900" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  drawer: {
    width: "82%", maxWidth: 360, height: "100%",
    backgroundColor: colors.surfaceSecondary,
    borderRightWidth: 3, borderRightColor: colors.brand,
    paddingHorizontal: spacing.sm,
  },
  drawerHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 2, borderBottomColor: colors.border,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 999, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "900" },
  drawerName: { color: colors.onSurface, fontSize: font.base, fontWeight: "800" },
  drawerEmail: { color: colors.muted, fontSize: font.sm },
  drawerBody: { gap: spacing.xs, paddingTop: spacing.md },
  drawerItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    minHeight: touchTarget.min, paddingHorizontal: spacing.sm, borderRadius: radius.md,
  },
  drawerItemText: { color: colors.onSurface, fontSize: font.base, fontWeight: "700" },
  logoutItem: { marginTop: spacing.md, borderTopWidth: 2, borderTopColor: colors.border, paddingTop: spacing.md },
  searchOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", paddingHorizontal: spacing.sm },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2, borderColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: touchTarget.min,
  },
  searchInput: {
    flex: 1, color: colors.onSurface, fontSize: font.base, paddingVertical: spacing.sm,
  },
});
