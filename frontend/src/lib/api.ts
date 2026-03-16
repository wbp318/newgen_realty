import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Properties
export const getProperties = (params?: Record<string, string | number>) =>
  api.get("/api/properties", { params });
export const createProperty = (data: Record<string, unknown>) =>
  api.post("/api/properties", data);
export const getProperty = (id: string) => api.get(`/api/properties/${id}`);
export const updateProperty = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/properties/${id}`, data);
export const deleteProperty = (id: string) =>
  api.delete(`/api/properties/${id}`);

// Contacts
export const getContacts = (params?: Record<string, string | number>) =>
  api.get("/api/contacts", { params });
export const createContact = (data: Record<string, unknown>) =>
  api.post("/api/contacts", data);
export const getContact = (id: string) => api.get(`/api/contacts/${id}`);
export const updateContact = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/contacts/${id}`, data);
export const deleteContact = (id: string) =>
  api.delete(`/api/contacts/${id}`);

// Activities
export const getActivities = (params?: Record<string, string | number>) =>
  api.get("/api/activities", { params });
export const createActivity = (data: Record<string, unknown>) =>
  api.post("/api/activities", data);

// Conversations
export const getConversations = () => api.get("/api/conversations");
export const getConversation = (id: string) =>
  api.get(`/api/conversations/${id}`);
export const createConversation = (data: Record<string, unknown>) =>
  api.post("/api/conversations", data);
export const deleteConversation = (id: string) =>
  api.delete(`/api/conversations/${id}`);

// AI
export const aiChat = (
  messages: { role: string; content: string }[],
  conversationId?: string | null
) => api.post("/api/ai/chat", { messages, conversation_id: conversationId });
export const generateListing = (data: Record<string, unknown>) =>
  api.post("/api/ai/generate-listing", data);
export const analyzeComps = (data: Record<string, unknown>) =>
  api.post("/api/ai/analyze-comps", data);
export const draftCommunication = (data: Record<string, unknown>) =>
  api.post("/api/ai/draft-communication", data);
export const scoreLead = (contactId: string) =>
  api.post("/api/ai/score-lead", { contact_id: contactId });
export const matchProperties = (contactId: string) =>
  api.post("/api/ai/match-properties", { contact_id: contactId });
export const getDashboardInsights = () =>
  api.get("/api/ai/dashboard-insights");
export const getAiUsage = () => api.get("/api/ai/usage");

export default api;
