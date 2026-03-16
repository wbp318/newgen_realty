import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Properties
export const getProperties = () => api.get("/api/properties");
export const createProperty = (data: Record<string, unknown>) =>
  api.post("/api/properties", data);
export const getProperty = (id: string) => api.get(`/api/properties/${id}`);
export const updateProperty = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/properties/${id}`, data);
export const deleteProperty = (id: string) =>
  api.delete(`/api/properties/${id}`);

// Contacts
export const getContacts = () => api.get("/api/contacts");
export const createContact = (data: Record<string, unknown>) =>
  api.post("/api/contacts", data);
export const getContact = (id: string) => api.get(`/api/contacts/${id}`);
export const updateContact = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/contacts/${id}`, data);
export const deleteContact = (id: string) =>
  api.delete(`/api/contacts/${id}`);

// AI
export const aiChat = (messages: { role: string; content: string }[]) =>
  api.post("/api/ai/chat", { messages });
export const generateListing = (data: Record<string, unknown>) =>
  api.post("/api/ai/generate-listing", data);
export const analyzeComps = (data: Record<string, unknown>) =>
  api.post("/api/ai/analyze-comps", data);
export const draftCommunication = (data: Record<string, unknown>) =>
  api.post("/api/ai/draft-communication", data);

export default api;
