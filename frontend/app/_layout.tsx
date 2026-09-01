import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/lib/auth";
import { TtsProvider } from "@/src/lib/tts";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0];
    const inAuth = first === "auth";
    const isSplash = !first || first === "index";
    if (!user && !inAuth && !isSplash) {
      router.replace("/auth/login");
    } else if (user && (inAuth || isSplash)) {
      router.replace("/(tabs)/home");
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loading} testID="root-loading">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }
  return null;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <SafeAreaProvider>
        <AuthProvider>
          <TtsProvider>
            <StatusBar style="light" backgroundColor={colors.surface} />
            <AuthGate />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.surface },
                animation: "fade",
              }}
            />
          </TtsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
});
