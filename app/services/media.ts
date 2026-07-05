import { API_BASE } from '@/services/api';

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Normalize stored media URLs so they load on device (loopback → API_BASE, relative paths, etc.). */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${API_BASE}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (isLoopbackHost(parsed.hostname)) {
      const api = new URL(API_BASE);
      parsed.protocol = api.protocol;
      parsed.hostname = api.hostname;
      parsed.port = api.port;
      return parsed.toString();
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
