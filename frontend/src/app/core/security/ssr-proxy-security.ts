export const FORWARDABLE_REQUEST_HEADERS = [
  'accept',
  'content-type',
  'cookie',
  'authorization',
  'x-csrf-token',
  'x-xsrf-token',
  'x-client-platform',
  'origin',
  'referer',
  'user-agent',
] as const;

export const PASSTHROUGH_RESPONSE_HEADERS = [
  'content-type',
  'x-csrf-token',
  'retry-after',
] as const;

export const SSR_PROXY_TIMEOUT_MS = 65000;

export function createProxyAbortSignal(timeoutMs: number = SSR_PROXY_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

export function extractSafeRequestHeadersToForward(
  incomingHeaders: Record<string, string | string[] | undefined>,
  clientIp?: string
): Headers {
  const forwarded = new Headers();
  for (const name of FORWARDABLE_REQUEST_HEADERS) {
    const val = incomingHeaders[name];
    if (typeof val === 'string' && val.length > 0) {
      forwarded.set(name, val);
    }
  }
  if (typeof clientIp === 'string' && clientIp.length > 0) {
    forwarded.set('x-forwarded-for', clientIp);
  }
  return forwarded;
}

export function extractSetCookieHeadersFromUpstream(upstreamHeaders: Headers): string[] {
  const anyHeaders = upstreamHeaders as Headers & { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === 'function') {
    const list = anyHeaders.getSetCookie();
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  }
  const single = upstreamHeaders.get('set-cookie');
  return single ? [single] : [];
}

export function resolveAllowedHosts(rawEnvValue: string | undefined): string[] {
  const defaults = ['localhost', '127.0.0.1', '*.onrender.com'];
  const rawEnv = (rawEnvValue || '').trim();
  if (!rawEnv) {
    return defaults;
  }
  const custom = rawEnv
    .split(',')
    .map((h) => h.trim())
    .filter((h) => h.length > 0);
  return Array.from(new Set([...defaults, ...custom]));
}

export function resolveConfiguredBackendOrigin(rawBackendUrl: string | undefined): URL {
  const raw = (rawBackendUrl || 'http://localhost:5000').trim();
  const parsed = new URL(raw);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid BACKEND_URL protocol: ${parsed.protocol}`);
  }
  return parsed;
}

/**
 * Validates and builds a safe upstream URL restricted strictly to baseOriginUrl.origin.
 * Prevents SSRF / open-proxy attacks by rejecting protocol-relative paths, traversal segments,
 * embedded credentials, or any URL whose resolved origin differs from baseOriginUrl.origin.
 */
export function buildSafeProxyTargetUrl(rawSubpathAndQuery: string, baseOriginUrl: URL): URL | null {
  if (!rawSubpathAndQuery || typeof rawSubpathAndQuery !== 'string') {
    return null;
  }
  const normalized = rawSubpathAndQuery.startsWith('/') ? rawSubpathAndQuery : `/${rawSubpathAndQuery}`;

  if (
    normalized.startsWith('//') ||
    normalized.includes('://') ||
    normalized.includes('\\') ||
    normalized.includes('@') ||
    normalized.includes('..')
  ) {
    return null;
  }

  try {
    const resolved = new URL(normalized, baseOriginUrl.origin);
    if (resolved.origin !== baseOriginUrl.origin) {
      return null;
    }
    return resolved;
  } catch {
    return null;
  }
}
