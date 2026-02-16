export interface Theme {
  id: string;
  name: string;
  preview_colors: string[];
}

export interface GenerateRequest {
  city: string;
  country: string;
  theme: string;
  distance: number;
  email: string;
}

export interface GenerateResponse {
  job_id: string;
  status: string;
  estimated_seconds: number;
}

export interface StatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  city: string;
  theme: string;
  poster_url?: string;
  stage?: string;
  error_message?: string;
}

export async function fetchThemes(): Promise<Theme[]> {
  const res = await fetch('/api/themes');
  if (!res.ok) throw new Error('Failed to fetch themes');
  const data = await res.json();
  return data.themes;
}

export async function generatePoster(data: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 429) {
    throw new Error('RATE_LIMITED');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Generation failed');
  }
  return res.json();
}

export interface GeocodeSuggestion {
  display_name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export async function fetchGeocode(query: string): Promise<GeocodeSuggestion[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchStatus(jobId: string): Promise<StatusResponse> {
  const res = await fetch(`/api/status/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}
