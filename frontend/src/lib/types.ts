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
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
