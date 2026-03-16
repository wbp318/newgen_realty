export interface Property {
  id: string;
  street_address: string;
  city: string;
  parish: string;
  state: string;
  zip_code: string;
  property_type: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  lot_size_acres: number | null;
  year_built: number | null;
  asking_price: number | null;
  ai_suggested_price: number | null;
  ai_description: string | null;
  features: Record<string, unknown> | null;
  photos: string[] | null;
  mls_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  contact_type: string;
  preferred_parishes: string[] | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_property_types: string[] | null;
  preferred_cities: string[] | null;
  source: string | null;
  last_contact_date: string | null;
  ai_lead_score: number | null;
  ai_lead_score_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  contact_id: string | null;
  property_id: string | null;
  extra_data: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  context_type: string | null;
  context_id: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface LeadScoreResult {
  contact_id: string;
  score: number;
  reason: string;
  suggested_action: string | null;
}

export interface PropertyMatchItem {
  property_id: string;
  match_score: number;
  reason: string;
}

export interface PropertyMatchResult {
  contact_id: string;
  matches: PropertyMatchItem[];
}

export interface DashboardInsights {
  insights: string[];
  actions: string[];
  opportunities: string[];
  raw_analysis: string;
}
