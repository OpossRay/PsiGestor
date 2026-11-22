import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  clearCsrfToken,
  credentialsInterceptor,
  getCsrfToken,
  setCsrfToken,
} from './credentials.interceptor';
import {
  buildSafeProxyTargetUrl,
  extractSafeRequestHeadersToForward,
  extractSetCookieHeadersFromUpstream,
} from '../security/ssr-proxy-security';

describe('Subphase 2C — Web CSRF Interceptor & SSR Proxy Security', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    clearCsrfToken();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    clearCsrfToken();
  });

  it('captures csrfToken from /api/auth/login response and attaches X-CSRF-Token on subsequent POST', () => {
    http.post('/backend-api/api/auth/login', { email: 'a@b.com', password: '123' }).subscribe();

    const loginReq = httpMock.expectOne('/backend-api/api/auth/login');
    expect(loginReq.request.withCredentials).toBe(true);
    loginReq.flush(
      {
        message: 'ok',
        user: { id: 1, email: 'a@b.com', name: 'Test', role: 'psicologo', isActive: true },
        csrfToken: 'csrf_secret_from_server_999',
      },
      { headers: { 'X-CSRF-Token': 'csrf_secret_from_server_999' } }
    );

    expect(getCsrfToken(false)).toBe('csrf_secret_from_server_999');

    // Subsequent mutating POST must carry X-CSRF-Token header
    http.post('/backend-api/availabilities', { date: '2026-11-20' }).subscribe();
    const postReq = httpMock.expectOne('/backend-api/availabilities');
    expect(postReq.request.headers.get('X-CSRF-Token')).toBe('csrf_secret_from_server_999');
    postReq.flush({});

    // GET request does not need X-CSRF-Token header
    http.get('/backend-api/availabilities').subscribe();
    const getReq = httpMock.expectOne('/backend-api/availabilities');
    expect(getReq.request.headers.has('X-CSRF-Token')).toBe(false);
    getReq.flush([]);
  });

  it('clears CSRF token on clearCsrfToken()', () => {
    setCsrfToken('temp_token');
    expect(getCsrfToken(false)).toBe('temp_token');
    clearCsrfToken();
    expect(getCsrfToken(false)).toBeNull();
  });

  it('SSR proxy target builder strictly pins origin and rejects open-proxy / SSRF payloads', () => {
    const pinnedBackend = new URL('https://psigestor-api-staging.onrender.com');

    const validAuth = buildSafeProxyTargetUrl('/api/auth/me', pinnedBackend);
    expect(validAuth?.toString()).toBe('https://psigestor-api-staging.onrender.com/api/auth/me');

    const validQuery = buildSafeProxyTargetUrl('/appointments?date=2026-11-19', pinnedBackend);
    expect(validQuery?.toString()).toBe(
      'https://psigestor-api-staging.onrender.com/appointments?date=2026-11-19'
    );

    // Reject protocol-relative, absolute URLs, credentials, backslashes, and path traversal
    expect(buildSafeProxyTargetUrl('//evil.example.com/steal', pinnedBackend)).toBeNull();
    expect(buildSafeProxyTargetUrl('https://evil.example.com/steal', pinnedBackend)).toBeNull();
    expect(buildSafeProxyTargetUrl('/api/../../etc/passwd', pinnedBackend)).toBeNull();
    expect(buildSafeProxyTargetUrl('/api@evil.example.com', pinnedBackend)).toBeNull();
    expect(buildSafeProxyTargetUrl('/api\\evil.example.com', pinnedBackend)).toBeNull();
  });

  it('SSR proxy preserves Cookie, X-CSRF-Token, Origin, Referer and Set-Cookie headers while stripping arbitrary headers', () => {
    const incoming = {
      cookie: 'session=signed_session_abc; XSRF-TOKEN=csrf_123',
      'x-csrf-token': 'csrf_123',
      origin: 'https://psigestor-web-staging.onrender.com',
      referer: 'https://psigestor-web-staging.onrender.com/calendar',
      'content-type': 'application/json',
      'x-malicious-untrusted-header': 'should_be_dropped',
      host: 'evil.host.override',
    };

    const forwarded = extractSafeRequestHeadersToForward(incoming, '203.0.113.10');
    expect(forwarded.get('cookie')).toBe('session=signed_session_abc; XSRF-TOKEN=csrf_123');
    expect(forwarded.get('x-csrf-token')).toBe('csrf_123');
    expect(forwarded.get('origin')).toBe('https://psigestor-web-staging.onrender.com');
    expect(forwarded.get('referer')).toBe('https://psigestor-web-staging.onrender.com/calendar');
    expect(forwarded.get('x-forwarded-for')).toBe('203.0.113.10');
    expect(forwarded.get('x-malicious-untrusted-header')).toBeNull();
    expect(forwarded.get('host')).toBeNull();

    const upstreamHeaders = new Headers();
    upstreamHeaders.append('Set-Cookie', 'session=new_session; HttpOnly; SameSite=Lax; Path=/');
    upstreamHeaders.append('Set-Cookie', 'XSRF-TOKEN=new_csrf; SameSite=Lax; Path=/');

    const extractedCookies = extractSetCookieHeadersFromUpstream(upstreamHeaders);
    expect(extractedCookies.length).toBeGreaterThanOrEqual(1);
    expect(extractedCookies.join('; ')).toContain('session=new_session');
  });
});
