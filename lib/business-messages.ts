import { apiFetch } from "@/lib/api";

export type MessageSender = {
  id?: number | null;
  role?: string | null;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type BusinessMessage = {
  id: number;
  conversation_id: number;
  sender_user_id?: number | null;
  body?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sender?: MessageSender | null;
  meta?: Record<string, unknown> | null;
};

export type ContactStatus = {
  can_send?: boolean;
  reason?: string | null;
  message?: string | null;
  paused_at?: string | null;
  job_post_id?: number | null;
  application_id?: number | null;
};

export type BusinessConversation = {
  id: number;
  application_id?: number | null;
  job_post_id?: number | null;
  unread_count?: number | null;
  last_message_at?: string | null;
  other_party?: {
    id?: number | null;
    display_name?: string | null;
    email?: string | null;
    headline?: string | null;
    role?: string | null;
  } | null;
  contact_status?: ContactStatus | null;
};

type ConversationsResponse = {
  items?: BusinessConversation[];
};

type MessagesResponse = {
  items?: BusinessMessage[];
};

type ConversationActionResponse = {
  ok?: boolean;
  conversation?: BusinessConversation;
};

export async function fetchBusinessConversations() {
  const response = await apiFetch<ConversationsResponse>("/api/conversations");
  return response.items || [];
}

export async function fetchBusinessConversationMessages(conversationId: number) {
  const response = await apiFetch<MessagesResponse>(
    `/api/conversations/${conversationId}/messages`,
  );
  return response.items || [];
}

export async function sendBusinessConversationMessage(
  conversationId: number,
  body: string,
) {
  return apiFetch<{
    message?: BusinessMessage;
    conversation?: BusinessConversation;
  }>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function markBusinessConversationRead(conversationId: number) {
  return apiFetch<{ ok: boolean }>(`/api/conversations/${conversationId}/read`, {
    method: "POST",
  });
}

export async function pauseBusinessConversationContact(conversationId: number) {
  return apiFetch<ConversationActionResponse>(
    `/api/conversations/${conversationId}/pause-contact`,
    { method: "POST" },
  );
}

export async function resumeBusinessConversationContact(conversationId: number) {
  return apiFetch<ConversationActionResponse>(
    `/api/conversations/${conversationId}/resume-contact`,
    { method: "POST" },
  );
}
