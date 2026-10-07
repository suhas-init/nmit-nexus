import { api } from "@/lib/api";

export type Notification = {
  id: string;
  type: string;
  payload: { title?: string; body?: string; href?: string; [k: string]: any };
  read_at: string | null;
  created_at: string;
};

export const notifApi = {
  list: (token: string) => api.get<Notification[]>("/notifications", token),
  unread: (token: string) => api.get<{ count: number }>("/notifications/unread-count", token),
  markRead: (id: string, token: string) => api.patch(`/notifications/${id}/read`, {}, token),
  readAll: (token: string) => api.post("/notifications/read-all", {}, token),
};
