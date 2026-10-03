/**
 * Frontend client service for interacting with the backend Gemini API endpoints.
 * Never calls Gemini directly from the client.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  sources?: { title: string; uri: string }[];
}

export async function generateOrEditImage(params: {
  prompt: string;
  image?: string;
  mimeType?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}): Promise<{ imageUrl: string; text?: string }> {
  const res = await fetch('/api/gemini/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Image generation failed with status ${res.status}`);
  }

  return res.json();
}

export async function startVeoVideo(params: {
  prompt: string;
  image?: string;
  mimeType?: string;
  aspectRatio?: '16:9' | '9:16';
}): Promise<{ operationName: string }> {
  const res = await fetch('/api/gemini/video-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Veo video generation failed with status ${res.status}`);
  }

  return res.json();
}

export async function pollVeoVideoStatus(
  operationName: string
): Promise<{ done: boolean; error?: any }> {
  const res = await fetch('/api/gemini/video-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to poll video status');
  }

  return res.json();
}

export async function downloadVeoVideoBlob(operationName: string): Promise<Blob> {
  const res = await fetch('/api/gemini/video-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  if (!res.ok) {
    throw new Error(`Failed to download video: ${res.statusText}`);
  }

  return res.blob();
}

export async function sendChatToDirector(params: {
  messages: { role: string; content: string }[];
  model?: 'gemini-3.8-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite';
  systemInstruction?: string;
}): Promise<{ text: string }> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err.error ||
      (res.status === 402
        ? 'Prepayment credits are depleted for this API key. Manage your project at https://ai.studio/projects.'
        : `Chat request failed with status ${res.status}`);
    const customError: any = new Error(message);
    customError.isBillingError = Boolean(err.isBillingError || res.status === 402);
    customError.billingUrl = err.billingUrl || 'https://ai.studio/projects';
    throw customError;
  }

  return res.json();
}

export async function searchGroundedInformation(
  query: string
): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
  const res = await fetch('/api/gemini/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Search grounding request failed');
  }

  return res.json();
}

export async function generateMusicTrack(params: {
  prompt: string;
  model?: 'lyria-3-clip-preview' | 'lyria-3-pro-preview';
}): Promise<{ audioUrl: string; lyrics?: string; mimeType: string }> {
  const res = await fetch('/api/gemini/music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Music generation request failed');
  }

  return res.json();
}

export async function speakScript(params: {
  text: string;
  voice?: string;
}): Promise<{ audioUrl: string }> {
  const res = await fetch('/api/gemini/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Speech synthesis failed');
  }

  return res.json();
}
