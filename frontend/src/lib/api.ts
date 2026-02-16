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
  output_format: string;
  custom_title: string;
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

export interface ShareResponse {
  share_id: string;
  share_url: string;
}

export interface GalleryItem {
  share_id: string;
  city: string;
  country: string;
  theme: string;
  poster_url: string;
  created_at: string;
}

export async function sharePoster(jobId: string, galleryOptIn: boolean): Promise<ShareResponse> {
  const res = await fetch(`/api/poster/${jobId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gallery_opt_in: galleryOptIn }),
  });
  if (!res.ok) throw new Error('Failed to share poster');
  return res.json();
}

export async function fetchGallery(limit = 20, offset = 0): Promise<{ posters: GalleryItem[]; total: number }> {
  const res = await fetch(`/api/gallery?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch gallery');
  return res.json();
}
