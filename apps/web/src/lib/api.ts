const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ApiError = { status: number; detail: string };

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body);
    } catch {}
    throw { status: res.status, detail } as ApiError;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: "GET" }, token),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, token),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, token),
  del: <T>(path: string, token?: string | null) => request<T>(path, { method: "DELETE" }, token),
};

export type User = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  campus_verified: boolean;
  avatar_url: string | null;
  bio: string | null;
  completed_transactions: number;
  avg_rating: number;
  response_rate: number;
};

export type Listing = {
  id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  description: string;
  price: number;
  condition: string;
  status: string;
  type: string;
  created_at: string;
  sold_at: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};
