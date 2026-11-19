import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  tap,
  catchError,
  of,
  map,
  switchMap,
  from,
  finalize,
  shareReplay,
} from 'rxjs';
import { AuthResponse, MeResponse, RefreshResponse, User } from '../models/auth.model';
import {
  SecureStorageUnavailableError,
  SecureTokenStorageService,
} from './secure-token-storage.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private tokenStorage = inject(SecureTokenStorageService);

  currentUser = signal<User | null>(null);
  isLoading = signal<boolean>(false);
  sessionRestoreError = signal<string | null>(null);
  securePersistenceAvailable = signal<boolean>(true);

  private inFlightRefresh$: Observable<User | null> | null = null;

  private get baseUrl(): string {
    return `${environment.apiUrl}/api/auth`;
  }

  /**
   * Session verification and cold-start recovery flow:
   * 1. Queries /api/auth/me (if an in-memory accessToken is present, the interceptor attaches it).
   * 2. If the app was closed/restarted (RAM is empty) or the 15-min accessToken expired,
   *    retrieves the rotating refreshToken from Android Keystore / iOS Keychain and
   *    atomically rotates it via POST /api/auth/refresh.
   * 3. If SecureStorage is unavailable or fails, clears state, sets a controlled error message
   *    in `sessionRestoreError`, and returns null so the user is prompted to log in again.
   */
  checkSession(): Observable<User | null> {
    return this.http.get<MeResponse>(`${this.baseUrl}/me`).pipe(
      switchMap((res) => {
        if (res.authenticated && res.user) {
          this.sessionRestoreError.set(null);
          this.currentUser.set(res.user);
          return of(res.user);
        }
        return this.attemptSilentRefresh();
      }),
      catchError(() => this.attemptSilentRefresh())
    );
  }

  /**
   * Deduplicated silent refresh: concurrent callers share a single in-flight rotation request
   * to prevent duplicate POST /api/auth/refresh calls that would trigger token reuse revocation.
   */
  attemptSilentRefresh(): Observable<User | null> {
    if (this.inFlightRefresh$) {
      return this.inFlightRefresh$;
    }

    const refreshFlow$ = from(this.safeReadRefreshToken()).pipe(
      switchMap((readResult) => {
        if (readResult.unavailableError) {
          this.tokenStorage.setAccessToken(null);
          this.currentUser.set(null);
          this.securePersistenceAvailable.set(false);
          this.sessionRestoreError.set(readResult.unavailableError.message);
          return of(null);
        }

        const storedRefreshToken = readResult.token;
        if (!storedRefreshToken) {
          this.currentUser.set(null);
          return of(null);
        }

        return this.http
          .post<RefreshResponse>(`${this.baseUrl}/refresh`, {
            refreshToken: storedRefreshToken,
          })
          .pipe(
            switchMap((res) =>
              from(this.persistTokenPair(res.accessToken, res.refreshToken)).pipe(
                map((persistedOk) => {
                  if (!persistedOk) {
                    this.tokenStorage.setAccessToken(null);
                    this.currentUser.set(null);
                    return null;
                  }
                  this.sessionRestoreError.set(null);
                  this.currentUser.set(res.user);
                  return res.user;
                })
              )
            ),
            catchError(() =>
              from(this.tokenStorage.clearAllTokens()).pipe(
                map(() => {
                  this.currentUser.set(null);
                  this.sessionRestoreError.set(
                    'Tu sesión ha expirado o fue revocada. Por favor, inicia sesión nuevamente.'
                  );
                  return null;
                })
              )
            )
          );
      }),
      finalize(() => {
        this.inFlightRefresh$ = null;
      }),
      shareReplay(1)
    );

    this.inFlightRefresh$ = refreshFlow$;
    return refreshFlow$;
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    this.sessionRestoreError.set(null);
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      switchMap((res) =>
        from(this.persistTokenPair(res.accessToken, res.refreshToken)).pipe(
          tap(() => {
            this.currentUser.set(res.user);
          }),
          map(() => res)
        )
      )
    );
  }

  registerStudent(payload: {
    name: string;
    email: string;
    password: string;
    studentCode: string;
    program?: string;
    semester?: number;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload);
  }

  logout(): Observable<{ message: string }> {
    return from(this.safeReadRefreshToken()).pipe(
      switchMap((readResult) =>
        this.http
          .post<{ message: string }>(`${this.baseUrl}/logout`, {
            refreshToken: readResult.token || undefined,
          })
          .pipe(
            switchMap((res) =>
              from(this.tokenStorage.clearAllTokens()).pipe(
                tap(() => {
                  this.sessionRestoreError.set(null);
                  this.currentUser.set(null);
                }),
                map(() => res)
              )
            ),
            catchError(() =>
              from(this.tokenStorage.clearAllTokens()).pipe(
                tap(() => {
                  this.sessionRestoreError.set(null);
                  this.currentUser.set(null);
                }),
                map(() => ({ message: 'Sesión cerrada localmente.' }))
              )
            )
          )
      )
    );
  }

  private async safeReadRefreshToken(): Promise<{
    token: string | null;
    unavailableError: SecureStorageUnavailableError | null;
  }> {
    try {
      const token = await this.tokenStorage.getRefreshToken();
      return { token, unavailableError: null };
    } catch (err) {
      if (err instanceof SecureStorageUnavailableError) {
        return { token: null, unavailableError: err };
      }
      return {
        token: null,
        unavailableError: new SecureStorageUnavailableError(),
      };
    }
  }

  private async persistTokenPair(
    accessToken: string | undefined,
    refreshToken: string | undefined
  ): Promise<boolean> {
    this.tokenStorage.setAccessToken(accessToken || null);
    if (refreshToken !== undefined) {
      try {
        await this.tokenStorage.setRefreshToken(refreshToken);
        this.securePersistenceAvailable.set(true);
        return true;
      } catch (err) {
        this.securePersistenceAvailable.set(false);
        if (err instanceof SecureStorageUnavailableError) {
          this.sessionRestoreError.set(err.message);
        }
        return false;
      }
    }
    return true;
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  isAlumno(): boolean {
    return this.currentUser()?.role === 'alumno';
  }

  isPsicologo(): boolean {
    return this.currentUser()?.role === 'psicologo';
  }
}
