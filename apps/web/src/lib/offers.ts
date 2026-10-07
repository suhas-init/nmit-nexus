import { api } from "@/lib/api";

export type Offer = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_price: number;
  message: string | null;
  status: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: string;
  body: string;
  created_at: string;
};

export const offersApi = {
  create: (listingId: string, body: { offer_price: number; message?: string }, token: string) =>
    api.post<Offer>(`/listings/${listingId}/offers`, body, token),
  listForListing: (listingId: string, token: string) =>
    api.get<Offer[]>(`/listings/${listingId}/offers`, token),
  respond: (offerId: string, action: "accept" | "reject", token: string) =>
    api.patch<Offer>(`/offers/${offerId}?action=${action}`, {}, token),
  conversations: (token: string) => api.get<Conversation[]>("/conversations", token),
  messages: (convId: string, token: string) => api.get<Message[]>(`/conversations/${convId}/messages`, token),
  send: (convId: string, body: string, token: string) =>
    api.post<Message>(`/conversations/${convId}/messages`, { body }, token),
};
