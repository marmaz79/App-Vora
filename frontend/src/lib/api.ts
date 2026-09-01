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
  created_at: string;
};

export type BookContent = { book_id: string; title: string; pages: string[] };

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
};
