import { Platform } from "react-native";
import { getToken } from "./tokenStore";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL as string;

export type ApiError = { detail: string; status: number };

async function request<T>(
  path: string,
  opts: RequestInit = {},
  auth: boolean = true
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (opts.body && !(opts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const ct = res.headers.get("content-type") || "";
  const parseBody = async () => {
    if (ct.includes("application/json")) return res.json();
    const t = await res.text();
    try { return JSON.parse(t); } catch { return { detail: t }; }
  };
  if (!res.ok) {
    const body = await parseBody();
    const err: ApiError = { detail: body?.detail || `Errore ${res.status}`, status: res.status };
    throw err;
  }
  return (await parseBody()) as T;
}

function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fn(ctrl.signal).finally(() => clearTimeout(t));
}

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  auth_provider: string;
};

export type Book = {
  book_id: string;
  owner_id: string;
  title: string;
  file_type: "pdf" | "epub";
  storage_path: string;
  size: number;
  pages: number;
  source?: string | null;
  ocr_engine?: string | null;
  created_at: string;
};

export type BookContent = { book_id: string; title: string; pages: string[]; source?: string | null };

export const api = {
  register: (email: string, password: string, name: string) =>
    request<{ session_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }, false),
  login: (email: string, password: string) =>
    request<{ session_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false),
  googleSession: (session_id: string) =>
    request<{ session_token: string; user: User }>("/auth/session", {
      method: "POST",
      body: JSON.stringify({ session_id }),
    }, false),
  me: () => request<User>("/auth/me"),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  listBooks: () => request<Book[]>("/books"),
  getContent: (book_id: string) => request<BookContent>(`/books/${book_id}/content`),
  deleteBook: (book_id: string) => request<{ ok: boolean }>(`/books/${book_id}`, { method: "DELETE" }),
  enhanceBook: (book_id: string) =>
    withTimeout((signal) =>
      request<Book>(`/books/${book_id}/enhance`, { method: "POST", signal }), 300000),
  ttsPage: (book_id: string, page_index: number, voice: string) =>
    withTimeout((signal) =>
      request<{ url: string }>("/tts/page", {
        method: "POST",
        body: JSON.stringify({ book_id, page_index, voice }),
        signal,
      }), 120000),
  ttsPreview: (voice: string) =>
    withTimeout((signal) =>
      request<{ url: string }>("/tts/preview", {
        method: "POST",
        body: JSON.stringify({ voice }),
        signal,
      }), 120000),
  uploadBook: async (uri: string, name: string, mimeType?: string): Promise<Book> => {
    const token = await getToken();
    const form = new FormData();
    if (Platform.OS === "web") {
      const blob = await (await fetch(uri)).blob();
      form.append("file", blob, name);
    } else {
      form.append("file", { uri, name, type: mimeType || "application/octet-stream" } as any);
    }
    const res = await fetch(`${BASE}/api/books/upload`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
      body: form as any,
    });
    if (!res.ok) {
      let detail = `Errore ${res.status}`;
      try { const j = await res.json(); detail = j?.detail || detail; } catch {}
      throw { detail, status: res.status } as ApiError;
    }
    return (await res.json()) as Book;
  },
  scanBook: async (pages: { uri: string; name: string }[], title: string): Promise<Book> => {
    const token = await getToken();
    const form = new FormData();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (Platform.OS === "web") {
        const blob = await (await fetch(p.uri)).blob();
        form.append("files", blob, p.name || `page_${i + 1}.jpg`);
      } else {
        form.append("files", { uri: p.uri, name: p.name || `page_${i + 1}.jpg`, type: "image/jpeg" } as any);
      }
    }
    const q = encodeURIComponent(title || "Libro scansionato");
    const res = await fetch(`${BASE}/api/books/scan?title=${q}`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
      body: form as any,
    });
    if (!res.ok) {
      let detail = `Errore ${res.status}`;
      try { const j = await res.json(); detail = j?.detail || detail; } catch {}
      throw { detail, status: res.status } as ApiError;
    }
    return (await res.json()) as Book;
  },
};
