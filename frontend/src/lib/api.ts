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
export const autoCompAnalysis = (propertyId: string, compCount?: number) =>
  api.post("/api/ai/auto-comp-analysis", { property_id: propertyId, comp_count: compCount || 10 });

// Market Data
export const getMarketStatus = () => api.get("/api/market/status");
export const searchMarketComps = (data: Record<string, unknown>) =>
  api.post("/api/market/comps", data);
export const lookupProperty = (address: string) =>
  api.post("/api/market/property", { address });

// Prospects
export const getProspects = (params?: Record<string, string | number>) =>
  api.get("/api/prospects", { params });
export const createProspect = (data: Record<string, unknown>) =>
  api.post("/api/prospects", data);
export const getProspect = (id: string) => api.get(`/api/prospects/${id}`);
export const updateProspect = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/prospects/${id}`, data);
export const deleteProspect = (id: string) =>
  api.delete(`/api/prospects/${id}`);
export const searchProspects = (data: Record<string, unknown>) =>
  api.post("/api/prospects/search", data);
export const enrichProspect = (id: string) =>
  api.post(`/api/prospects/${id}/enrich`);
export const convertProspect = (id: string) =>
  api.post(`/api/prospects/${id}/convert`);
export const getAttomStatus = () => api.get("/api/prospects/status");

export const skipTraceProspect = (id: string) =>
  api.post(`/api/prospects/${id}/skip-trace`);
export const batchSkipTrace = (prospectIds: string[]) =>
  api.post("/api/prospects/batch-skip-trace", prospectIds);
export const batchDncCheck = (prospectIds: string[]) =>
  api.post("/api/prospects/batch-dnc-check", prospectIds);

// Prospect Lists
export const getProspectLists = () => api.get("/api/prospects/lists");
export const createProspectList = (data: Record<string, unknown>) =>
  api.post("/api/prospects/lists", data);
export const getProspectList = (id: string) =>
  api.get(`/api/prospects/lists/${id}`);
export const updateProspectList = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/prospects/lists/${id}`, data);

// AI Prospect Scoring
export const scoreProspect = (prospectId: string) =>
  api.post("/api/ai/score-prospect", { prospect_id: prospectId });
export const bulkScoreProspects = (prospectIds: string[]) =>
  api.post("/api/ai/bulk-score-prospects", { prospect_ids: prospectIds });

// Outreach Campaigns
export const getOutreachCampaigns = (params?: Record<string, string | number>) =>
  api.get("/api/outreach/campaigns", { params });
export const createOutreachCampaign = (data: Record<string, unknown>) =>
  api.post("/api/outreach/campaigns", data);
export const getOutreachCampaign = (id: string) =>
  api.get(`/api/outreach/campaigns/${id}`);
export const updateOutreachCampaign = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/outreach/campaigns/${id}`, data);
export const generateOutreachMessage = (data: Record<string, unknown>) =>
  api.post("/api/outreach/generate-message", data);
export const getCampaignMessages = (campaignId: string) =>
  api.get(`/api/outreach/campaigns/${campaignId}/messages`);
export const getCampaignInsights = (campaignId: string) =>
  api.post(`/api/outreach/campaigns/${campaignId}/insights`);

export default api;
