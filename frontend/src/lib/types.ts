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
  prospect_id: string | null;
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

// Market Data
export interface MarketComp {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  sale_price: number;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  lot_size_acres: number | null;
  year_built: number | null;
  sale_date: string | null;
  distance_miles: number | null;
  property_type: string | null;
}

export interface MarketCompResponse {
  subject_address: string;
  comps: MarketComp[];
  source: string;
}

export interface CompAnalysisResult {
  suggested_price: number;
  price_range_low: number;
  price_range_high: number;
  analysis: string;
}

// Prospects
export interface Prospect {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mailing_address: string | null;
  property_address: string;
  property_city: string | null;
  property_parish: string | null;
  property_state: string;
  property_zip: string | null;
  prospect_type: string;
  status: string;
  motivation_signals: Record<string, unknown> | null;
  property_data: Record<string, unknown> | null;
  ai_prospect_score: number | null;
  ai_prospect_score_reason: string | null;
  ai_scored_at: string | null;
  consent_status: string;
  consent_date: string | null;
  consent_method: string | null;
  dnc_checked: boolean;
  dnc_checked_at: string | null;
  dnc_listed: boolean;
  opt_out_date: string | null;
  opt_out_processed: boolean;
  contact_window_timezone: string | null;
  contact_id: string | null;
  data_source: string;
  source_record_id: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectList {
  id: string;
  name: string;
  description: string | null;
  search_criteria: Record<string, unknown> | null;
  prospect_count: number;
  prospect_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectSearchResult {
  prospects: Prospect[];
  total_found: number;
  imported_count: number;
  skipped_count: number;
  search_criteria: Record<string, unknown>;
  source: string;
}

export interface ProspectScoreResult {
  prospect_id: string;
  score: number;
  reason: string;
  motivation_level: string;
  suggested_approach: string | null;
  suggested_outreach_type: string | null;
}

export interface ProspectGeoPoint {
  id: string;
  latitude: number;
  longitude: number;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_parish: string | null;
  prospect_type: string;
  status: string;
  ai_prospect_score: number | null;
}

export interface GeocodeBackfillResult {
  scanned: number;
  updated: number;
  failed: number;
}

// Outreach
export interface SequenceStep {
  step: number;
  day_offset: number;
  medium: string;
  tone_override: string | null;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string | null;
  status: string;
  prospect_list_id: string | null;
  message_template: string | null;
  ai_personalize: boolean;
  total_messages: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  replied_count: number;
  ai_campaign_insights: string | null;
  ai_insights_generated_at: string | null;
  sequence_config: SequenceStep[] | null;
  send_window_start: number | null;
  send_window_end: number | null;
  daily_send_cap: number | null;
  started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachMessage {
  id: string;
  campaign_id: string;
  prospect_id: string;
  medium: string;
  subject: string | null;
  body: string;
  status: string;
  scheduled_send_time: string | null;
  sequence_step: number | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  provider: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  retry_count: number | null;
  extra_data: Record<string, unknown> | null;
  consent_verified: boolean;
  dnc_cleared: boolean;
  compliance_notes: string | null;
  created_at: string;
}

export interface ActivateCampaignResult {
  campaign_id: string;
  status: string;
  queued: number;
  skipped_existing: number;
  blocked: number;
}

export interface GeneratedMessage {
  subject: string | null;
  body: string;
  compliance_flags: string[];
}

export interface CampaignInsights {
  campaign_id: string;
  total_sent: number;
  response_rate: number;
  top_performing_prospect_types: string[];
  suggestions: string[];
  raw_analysis: string;
}
