import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { tap } from 'rxjs';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let inMemoryCsrfToken: string | null = null;

export function setCsrfToken(token: string | null | undefined): void {
  if (token && typeof token === 'string' && token.trim().length > 0) {
    inMemoryCsrfToken = token.trim();
  }
}

export function clearCsrfToken(): void {
  inMemoryCsrfToken = null;
}

export function getCsrfToken(isBrowser: boolean): string | null {
  if (inMemoryCsrfToken) {
    return inMemoryCsrfToken;
  }
  if (!isBrowser || typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  const headers: Record<string, string> = {};
  if (MUTATING_METHODS.has(req.method.toUpperCase())) {
    const csrfToken = getCsrfToken(isBrowser);
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const clonedRequest = req.clone({
    withCredentials: true,
    setHeaders: headers,
  });

  return next(clonedRequest).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        const headerToken = event.headers.get('X-CSRF-Token');
        if (headerToken) {
          setCsrfToken(headerToken);
        }
        const body = event.body as Record<string, unknown> | null;
        if (body && typeof body === 'object' && typeof body['csrfToken'] === 'string') {
          setCsrfToken(body['csrfToken'] as string);
        }
      }
    })
  );
};
