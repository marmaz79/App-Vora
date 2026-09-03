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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setErr(null);
    if (!name.trim() || !email.trim() || !password) {
      setErr("Compila tutti i campi");
      return;
    }
    if (password.length < 6) {
      setErr("La password deve avere almeno 6 caratteri");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim());
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setErr(e?.detail || "Registrazione non riuscita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Ionicons name="book" size={44} color={colors.onSurface} />
          </View>
          <Text style={styles.brandName}>Voicebook</Text>
        </View>

        <Text style={styles.title} accessibilityRole="header">Crea account</Text>
        <Text style={styles.subtitle}>Inizia ad ascoltare i tuoi libri</Text>

        {err ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite" testID="register-error">
            <Ionicons name="alert-circle" size={24} color={colors.onError} />
            <Text style={styles.errorText}>{err}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            testID="register-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Il tuo nome"
            placeholderTextColor={colors.muted}
            style={styles.input}
            accessibilityLabel="Campo nome"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="register-email-input"
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
            testID="register-password-input"
            value={password}
            onChangeText={setPassword}
            placeholder="Almeno 6 caratteri"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            accessibilityLabel="Campo password"
          />
        </View>

        <Pressable
          testID="register-submit-button"
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={submit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Registrati"
        >
          {loading ? <ActivityIndicator color={colors.onSurface} /> : <Text style={styles.primaryBtnText}>Registrati</Text>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hai già un account?</Text>
          <Link href="/auth/login" asChild>
            <Pressable
              testID="register-goto-login"
              style={styles.linkBtn}
              accessibilityRole="link"
              accessibilityLabel="Vai al login"
            >
              <Text style={styles.linkText}>Accedi</Text>
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
    width: 80, height: 80, borderRadius: radius.md, backgroundColor: "transparent",
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.onSurface,
  },
  brandName: { color: colors.onSurface, fontSize: font.xl, fontWeight: "900", letterSpacing: 1 },
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
    backgroundColor: "transparent",
    minHeight: touchTarget.min,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: colors.onSurface,
  },
  primaryBtnText: { color: colors.onSurface, fontSize: font.lg, fontWeight: "900" },
  pressed: { opacity: 0.7 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, marginTop: spacing.md },
  footerText: { color: colors.muted, fontSize: font.sm },
  linkBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minHeight: 44 },
  linkText: { color: colors.brand, fontSize: font.base, fontWeight: "900", textDecorationLine: "underline" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.error, padding: spacing.sm, borderRadius: radius.md,
  },
  errorText: { color: colors.onError, fontSize: font.sm, fontWeight: "700", flex: 1 },
});
