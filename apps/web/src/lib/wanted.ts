import { api } from "@/lib/api";

export type WantedPost = {
  id: string;
  buyer_id: string;
  category_id: string | null;
  title: string;
  description: string;
  max_price: number;
  min_condition: string;
  deadline: string | null;
  status: string;
  created_at: string;
};

export type WantedBid = {
  id: string;
  wanted_post_id: string;
  seller_id: string;
  bid_price: number;
  message: string | null;
  status: string;
  created_at: string;
};

export const wantedApi = {
  list: (q?: string) => api.get<WantedPost[]>(`/wanted${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  get: (id: string) => api.get<WantedPost>(`/wanted/${id}`),
  create: (body: Partial<WantedPost> & { title: string; description: string; max_price: number }, token: string) =>
    api.post<WantedPost>("/wanted", body, token),
  bids: (id: string, token: string) => api.get<WantedBid[]>(`/wanted/${id}/bids`, token),
  bid: (id: string, body: { bid_price: number; message?: string }, token: string) =>
    api.post<WantedBid>(`/wanted/${id}/bids`, body, token),
  respond: (bidId: string, action: "accept" | "reject", token: string) =>
    api.patch<WantedBid>(`/wanted/bids/${bidId}?action=${action}`, {}, token),
};
