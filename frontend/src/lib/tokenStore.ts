import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
const KEY = "leggimi_session_token";

export async function saveToken(token: string) {
  if (isWeb) {
    try {
      window.localStorage.setItem(KEY, token);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (isWeb) {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(KEY);
}

export async function clearToken() {
  if (isWeb) {
    try {
      window.localStorage.removeItem(KEY);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
