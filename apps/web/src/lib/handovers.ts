import { api } from "@/lib/api";

export type Handover = {
  id: string;
  offer_id: string;
  listing_id: string;
  listing_title: string;
  seller_id: string;
  buyer_id: string;
  seller_token: string | null;
  buyer_token: string | null;
  seller_confirmed: boolean;
  buyer_confirmed: boolean;
  verified: boolean;
  verified_at: string | null;
  receipt_hash: string | null;
};

export const handoversApi = {
  init: (offerId: string, token: string) =>
    api.post<Handover>(`/handovers/init/${offerId}`, {}, token),
  get: (offerId: string, token: string) =>
    api.get<Handover>(`/handovers/${offerId}`, token),
  confirm: (offerId: string, role: "seller" | "buyer", code: string, token: string) =>
    api.post<Handover>(`/handovers/${offerId}/confirm`, { role, token: code }, token),
};
