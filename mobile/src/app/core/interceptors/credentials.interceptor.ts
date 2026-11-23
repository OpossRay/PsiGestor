import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SecureTokenStorageService } from '../services/secure-token-storage.service';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(SecureTokenStorageService);
  const accessToken = tokenStorage.getAccessToken();

  const headers: Record<string, string> = {
    'X-Client-Platform': 'mobile',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const clonedRequest = req.clone({
    withCredentials: true,
    setHeaders: headers,
  });

  const isAuthLifecycleEndpoint =
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/refresh') ||
    req.url.includes('/api/auth/logout') ||
    req.url.includes('/api/auth/register');

  return next(clonedRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthLifecycleEndpoint &&
        !req.headers.has('X-Retry-After-Refresh')
      ) {
        const authService = inject(AuthService);
        return authService.attemptSilentRefresh().pipe(
          switchMap(refreshedUser => {
            const newToken = tokenStorage.getAccessToken();
            if (!refreshedUser || !newToken) {
              return throwError(() => error);
            }
            const retriedRequest = req.clone({
              withCredentials: true,
              setHeaders: {
                'X-Client-Platform': 'mobile',
                'X-Retry-After-Refresh': 'true',
                Authorization: `Bearer ${newToken}`,
              },
            });
            return next(retriedRequest);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
