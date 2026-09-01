import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/lib/auth";
import { colors, font, radius, spacing, touchTarget } from "@/src/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onLogin = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setErr(null);
    if (!email.trim() || !password) {
      setErr("Inserisci email e password");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setErr(e?.detail || "Accesso non riuscito");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setErr(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      setErr(e?.detail || "Accesso Google non riuscito");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap} accessible accessibilityLabel="Logo Leggimi">
          <View style={styles.logo}>
            <Ionicons name="book" size={44} color={colors.onBrand} />
          </View>
          <Text style={styles.brandName} accessibilityRole="header">Leggimi</Text>
        </View>

        <Text style={styles.title} accessibilityRole="header">Accedi</Text>
        <Text style={styles.subtitle}>Ascolta i tuoi libri PDF ed EPUB</Text>

        {err ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite" testID="login-error">
            <Ionicons name="alert-circle" size={24} color={colors.onError} />
            <Text style={styles.errorText}>{err}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="login-email-input"
            value={email}
            onChangeText={setEmail}
            placeholder="tuo@email.it"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel="Campo email"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="login-password-input"
            value={password}
            onChangeText={setPassword}
            placeholder="La tua password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            accessibilityLabel="Campo password"
          />
        </View>

        <Pressable
          testID="login-submit-button"
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={onLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Accedi"
        >
          {loading ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.primaryBtnText}>Accedi</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oppure</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          testID="login-google-button"
          style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
          onPress={onGoogle}
          disabled={googleLoading}
          accessibilityRole="button"
          accessibilityLabel="Accedi con Google"
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.onSurface} />
          ) : (
            <>
              <Ionicons name="logo-google" size={28} color={colors.onSurface} />
              <Text style={styles.googleBtnText}>Continua con Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Non hai un account?</Text>
          <Link href="/auth/register" asChild>
            <Pressable
              testID="login-goto-register"
              style={styles.linkBtn}
              accessibilityRole="link"
              accessibilityLabel="Vai alla registrazione"
            >
              <Text style={styles.linkText}>Registrati</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  container: { paddingHorizontal: spacing.md, gap: spacing.sm },
  logoWrap: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.md },
  logo: {
    width: 96, height: 96, borderRadius: 999, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.onSurface,
  },
  brandName: { color: colors.brand, fontSize: font.xl, fontWeight: "900", letterSpacing: 1 },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: "900", marginTop: spacing.sm },
  subtitle: { color: colors.muted, fontSize: font.sm, marginBottom: spacing.sm },
  field: { gap: spacing.xs },
  label: { color: colors.onSurface, fontSize: font.sm, fontWeight: "700" },
  input: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.onSurface,
    fontSize: font.base,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.min,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  primaryBtn: {
    backgroundColor: colors.brand,
    minHeight: touchTarget.min,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: colors.onSurface,
  },
  primaryBtnText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "900" },
  pressed: { opacity: 0.7 },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: spacing.sm },
  dividerLine: { flex: 1, height: 2, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: font.sm, fontWeight: "700" },
  googleBtn: {
    backgroundColor: colors.surfaceSecondary,
    minHeight: touchTarget.min,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  googleBtnText: { color: colors.onSurface, fontSize: font.base, fontWeight: "700" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, marginTop: spacing.md, flexWrap: "wrap" },
  footerText: { color: colors.muted, fontSize: font.sm },
  linkBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minHeight: 44 },
  linkText: { color: colors.brand, fontSize: font.base, fontWeight: "900", textDecorationLine: "underline" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.error, padding: spacing.sm, borderRadius: radius.md,
  },
  errorText: { color: colors.onError, fontSize: font.sm, fontWeight: "700", flex: 1 },
});
