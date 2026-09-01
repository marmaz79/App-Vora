import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { api, User } from "./api";
import { clearToken, getToken, saveToken } from "./tokenStore";

if (Platform.OS === "web") {
  // no-op
} else {
  WebBrowser.maybeCompleteAuthSession();
}

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

// Guard for double-processing the same session_id
const processedSessionIds = new Set<string>();

function extractSessionId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const exchangeSessionId = useCallback(async (sid: string) => {
    if (processedSessionIds.has(sid)) return;
    processedSessionIds.add(sid);
    try {
      const res = await api.googleSession(sid);
      await saveToken(res.session_token);
      setUser(res.user);
    } catch (e) {
      console.warn("google exchange failed", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      await clearToken();
      setUser(null);
    }
  }, []);

  // Bootstrap: check web URL for session_id, then check stored token
  useEffect(() => {
    let capturedUrl: string | null = null;
    let sub: any;
    (async () => {
      try {
        if (Platform.OS === "web") {
          const href = typeof window !== "undefined" ? window.location.href : "";
          const sid = extractSessionId(href);
          if (sid) {
            await exchangeSessionId(sid);
            try {
              const url = new URL(window.location.href);
              url.hash = "";
              url.searchParams.delete("session_id");
              window.history.replaceState(window.history.state, "", url.toString());
            } catch {}
          } else {
            await refresh();
          }
        } else {
          sub = Linking.addEventListener("url", (e) => { capturedUrl = e.url; });
          const initial = await Linking.getInitialURL();
          const sid = extractSessionId(initial) || extractSessionId(capturedUrl);
          if (sid) {
            await exchangeSessionId(sid);
          } else {
            await refresh();
          }
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      try { sub?.remove?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.login(email, password);
    await saveToken(r.session_token);
    setUser(r.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const r = await api.register(email, password, name);
    await saveToken(r.session_token);
    setUser(r.user);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const redirectUrl = Platform.OS === "web" ? window.location.origin + "/" : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    let capturedUrl: string | null = null;
    const sub = Linking.addEventListener("url", (e) => { capturedUrl = e.url; });
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      let url: string | null = null;
      if (result.type === "success" && (result as any).url) url = (result as any).url;
      if (!url) url = capturedUrl;
      if (!url) url = await Linking.getInitialURL();
      const sid = extractSessionId(url);
      if (sid) await exchangeSessionId(sid);
    } finally {
      try { sub.remove(); } catch {}
    }
  }, [exchangeSessionId]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    await clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, loginWithGoogle, logout, refresh }),
    [user, loading, login, register, loginWithGoogle, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
