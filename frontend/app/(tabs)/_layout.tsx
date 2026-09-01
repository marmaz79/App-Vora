import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors, font, spacing } from "@/src/theme";

function TabIcon({ name, focused, label }: { name: keyof typeof Ionicons.glyphMap; focused: boolean; label: string }) {
  return (
    <View style={styles.tabItem} accessible accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }}>
      <Ionicons name={name} size={30} color={focused ? colors.brand : colors.onSurface} />
      <Text style={[styles.tabLabel, { color: focused ? colors.brand : colors.onSurface }]} numberOfLines={1}>
        {label}
      </Text>
      {focused ? <View style={styles.dot} /> : null}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 3,
          borderTopColor: colors.brand,
          ...(Platform.OS === "web" ? { height: 96 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.onSurface,
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} label="Home" />,
          tabBarAccessibilityLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Libreria",
          tabBarIcon: ({ focused }) => <TabIcon name="library" focused={focused} label="Libreria" />,
          tabBarAccessibilityLabel: "Libreria",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profilo",
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} label="Profilo" />,
          tabBarAccessibilityLabel: "Profilo",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Impostazioni",
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} label="Impostazioni" />,
          tabBarAccessibilityLabel: "Impostazioni",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 80,
    paddingVertical: spacing.xs,
  },
  tabLabel: { fontSize: font.sm, fontWeight: "800" },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.onBrand, marginTop: 2 },
});
