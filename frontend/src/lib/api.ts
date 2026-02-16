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
  message: string;
}

export interface StatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
  estimated_time?: number;
}

export async function fetchThemes(): Promise<Theme[]> {
  const res = await fetch('/api/themes');
  if (!res.ok) throw new Error('Failed to fetch themes');
  return res.json();
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

export async function fetchStatus(jobId: string): Promise<StatusResponse> {
  const res = await fetch(`/api/status/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}
