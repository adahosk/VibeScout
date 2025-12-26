
export enum VibeType {
  QUIET = 'Quiet/Work',
  ROMANTIC = 'Romantic',
  PARTY = 'Party/Lively',
  CASUAL = 'Casual',
  FANCY = 'Fancy/Upscale'
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  address: string;
  vibe: VibeType;
  vibeScore: number; // 0-10
  distance: string;
  priceLevel: string;
  bestFor: string;
  noiseLevel: 'Low' | 'Medium' | 'High';
  summary: string;
  rating: number;
  mapsUrl: string;
}

export interface ComparisonMatrix {
  headers: string[];
  rows: {
    feature: string;
    values: string[];
  }[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Base64 image data
  suggestions?: PlaceSuggestion[];
  comparison?: ComparisonMatrix;
  groundingLinks?: { title: string; url: string }[];
  timestamp: Date;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}
