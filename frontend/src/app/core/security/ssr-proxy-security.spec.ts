import {
  DEFAULT_TRUST_PROXY_HEADERS,
  FORWARDABLE_REQUEST_HEADERS,
  PASSTHROUGH_RESPONSE_HEADERS,
  SSR_PROXY_TIMEOUT_MS,
  buildSafeProxyTargetUrl,
  createProxyAbortSignal,
  extractSafeRequestHeadersToForward,
  extractSetCookieHeadersFromUpstream,
  resolveAllowedHosts,
  resolveConfiguredBackendOrigin,
  resolveTrustProxyHeaders,
} from './ssr-proxy-security';

describe('SSR Proxy Security & Timeout Helpers', () => {
  describe('Timeout and Signal configuration', () => {
    it('should define SSR_PROXY_TIMEOUT_MS as 100000 (100 seconds)', () => {
      expect(SSR_PROXY_TIMEOUT_MS).toBe(100000);
    });

    it('should create an AbortSignal instance using createProxyAbortSignal', () => {
      const signal = createProxyAbortSignal();
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('should allow custom timeout duration in createProxyAbortSignal', () => {
      const signal = createProxyAbortSignal(1000);
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });
  });

  describe('buildSafeProxyTargetUrl', () => {
    const baseOrigin = new URL('https://psigestor-api-staging.onrender.com');

    it('should allow valid relative paths and query parameters', () => {
      const target = buildSafeProxyTargetUrl('/api/v1/availabilities?date=2026-11-20', baseOrigin);
      expect(target).not.toBeNull();
      expect(target?.toString()).toBe('https://psigestor-api-staging.onrender.com/api/v1/availabilities?date=2026-11-20');
    });

    it('should reject protocol-relative URLs (open proxy attack)', () => {
      expect(buildSafeProxyTargetUrl('//evil.com/leak', baseOrigin)).toBeNull();
    });

    it('should reject URLs containing absolute schemes', () => {
      expect(buildSafeProxyTargetUrl('http://evil.com/leak', baseOrigin)).toBeNull();
      expect(buildSafeProxyTargetUrl('https://evil.com/leak', baseOrigin)).toBeNull();
    });

    it('should reject paths with backslashes or traversal segments', () => {
      expect(buildSafeProxyTargetUrl('/..\\admin', baseOrigin)).toBeNull();
      expect(buildSafeProxyTargetUrl('/api/../../etc/passwd', baseOrigin)).toBeNull();
    });

    it('should reject URLs with userinfo/credentials (@ sign)', () => {
      expect(buildSafeProxyTargetUrl('/attacker@evil.com/api', baseOrigin)).toBeNull();
    });
  });

  describe('resolveAllowedHosts', () => {
    it('should return defaults when env value is undefined or empty', () => {
      const hosts = resolveAllowedHosts(undefined);
      expect(hosts).toContain('localhost');
      expect(hosts).toContain('127.0.0.1');
      expect(hosts).toContain('*.onrender.com');
    });

    it('should parse custom comma-separated hosts and merge with defaults', () => {
      const hosts = resolveAllowedHosts('psigestor.itescam.edu.mx, staging.itescam.edu.mx');
      expect(hosts).toContain('localhost');
      expect(hosts).toContain('psigestor.itescam.edu.mx');
      expect(hosts).toContain('staging.itescam.edu.mx');
    });
  });

  describe('resolveConfiguredBackendOrigin', () => {
    it('should return default localhost when undefined', () => {
      const url = resolveConfiguredBackendOrigin(undefined);
      expect(url.origin).toBe('http://localhost:5000');
    });

    it('should parse valid https backend URL', () => {
      const url = resolveConfiguredBackendOrigin('https://psigestor-api.onrender.com');
      expect(url.origin).toBe('https://psigestor-api.onrender.com');
    });

    it('should throw on invalid protocol', () => {
      expect(() => resolveConfiguredBackendOrigin('ftp://invalid.com')).toThrow();
    });
  });

  describe('extractSafeRequestHeadersToForward', () => {
    it('should forward allowed headers and omit sensitive or disallowed headers', () => {
      const incoming = {
        'x-csrf-token': 'token123',
        'cookie': 'session=abc',
        'host': 'evil-host.com', // Not in FORWARDABLE_REQUEST_HEADERS
        'authorization': 'Bearer xyz',
      };
      const forwarded = extractSafeRequestHeadersToForward(incoming, '192.168.1.50');
      expect(forwarded.get('x-csrf-token')).toBe('token123');
      expect(forwarded.get('cookie')).toBe('session=abc');
      expect(forwarded.get('authorization')).toBe('Bearer xyz');
      expect(forwarded.get('host')).toBeNull();
      expect(forwarded.get('x-forwarded-for')).toBe('192.168.1.50');
    });
  });

  describe('extractSetCookieHeadersFromUpstream', () => {
    it('should extract set-cookie from standard Headers', () => {
      const headers = new Headers();
      headers.set('set-cookie', 'session=xyz; HttpOnly; Secure');
      const cookies = extractSetCookieHeadersFromUpstream(headers);
      expect(cookies.length).toBeGreaterThanOrEqual(1);
      expect(cookies[0]).toContain('session=xyz');
    });
  });

  describe('resolveTrustProxyHeaders', () => {
    it('should return default Render proxy headers when undefined or empty', () => {
      const headers = resolveTrustProxyHeaders(undefined);
      expect(headers).toEqual(['x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host']);
    });

    it('should parse valid custom comma-separated proxy headers', () => {
      const headers = resolveTrustProxyHeaders('x-forwarded-for, x-forwarded-proto');
      expect(headers).toEqual(['x-forwarded-for', 'x-forwarded-proto']);
    });

    it('should filter out headers that do not start with x-forwarded- or forwarded', () => {
      const headers = resolveTrustProxyHeaders('x-forwarded-for, host, user-agent');
      expect(headers).toEqual(['x-forwarded-for']);
    });
  });
});
