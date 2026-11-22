import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  KeychainAccess,
  type SecureStoragePlugin,
} from '@aparajita/capacitor-secure-storage';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SecureStorageUnavailableError,
  SecureTokenStorageService,
} from './secure-token-storage.service';
import { AuthService } from './auth.service';
import { credentialsInterceptor } from '../interceptors/credentials.interceptor';

function createNativePluginMock(initialStore: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialStore));

  const mockPlugin = {
    get: vi.fn(async (key: string) => {
      return store.has(key) ? store.get(key)! : null;
    }),
    set: vi.fn(async (key: string, data: unknown) => {
      store.set(key, String(data));
    }),
    remove: vi.fn(async (key: string) => {
      const existed = store.has(key);
      store.delete(key);
      return existed;
    }),
  };

  return { mockPlugin, store };
}

describe('Subphase 2C — Mobile Native SecureStorage (@aparajita/capacitor-secure-storage) & Auth Lifecycle', () => {
  let tokenStorage: SecureTokenStorageService;
  let authService: AuthService;
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        SecureTokenStorageService,
        AuthService,
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    tokenStorage = TestBed.inject(SecureTokenStorageService);
    authService = TestBed.inject(AuthService);
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('1. stores and retrieves refreshToken via native @aparajita/capacitor-secure-storage plugin and keeps accessToken in RAM only', async () => {
    const { mockPlugin, store } = createNativePluginMock();
    tokenStorage.configurePluginForTesting(mockPlugin, () => true);

    tokenStorage.setAccessToken('ram_only_access_token_123');
    await tokenStorage.setRefreshToken('keystore_keychain_refresh_token_456');

    expect(tokenStorage.getAccessToken()).toBe('ram_only_access_token_123');
    expect(mockPlugin.set).toHaveBeenCalledWith(
      'psigestor_native_refresh_token_v1',
      'keystore_keychain_refresh_token_456',
      false,
      false,
      KeychainAccess.afterFirstUnlockThisDeviceOnly
    );

    const retrieved = await tokenStorage.getRefreshToken();
    expect(retrieved).toBe('keystore_keychain_refresh_token_456');
    expect(mockPlugin.get).toHaveBeenCalledWith(
      'psigestor_native_refresh_token_v1',
      false,
      false
    );
    expect(store.get('psigestor_native_refresh_token_v1')).toBe(
      'keystore_keychain_refresh_token_456'
    );

    // Web Storage must remain completely untouched
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('2. fails safely when native SecureStorage plugin is unavailable: never uses RAM or Web Storage for refreshToken and sets controlled error', async () => {
    const { mockPlugin } = createNativePluginMock();
    tokenStorage.configurePluginForTesting(mockPlugin, () => false);

    // Direct storage calls throw SecureStorageUnavailableError and do NOT keep a RAM fallback
    await expect(
      tokenStorage.setRefreshToken('should_not_be_persisted')
    ).rejects.toBeInstanceOf(SecureStorageUnavailableError);

    await expect(tokenStorage.getRefreshToken()).rejects.toBeInstanceOf(
      SecureStorageUnavailableError
    );

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);

    // When checkSession / attemptSilentRefresh runs while plugin is unavailable,
    // it reports a controlled message in sessionRestoreError and returns null
    let resultUser: unknown = 'pending';
    authService.attemptSilentRefresh().subscribe((u) => {
      resultUser = u;
    });

    await new Promise((r) => setTimeout(r, 15));

    expect(resultUser).toBeNull();
    expect(authService.currentUser()).toBeNull();
    expect(authService.securePersistenceAvailable()).toBe(false);
    expect(authService.sessionRestoreError()).toContain(
      'almacenamiento seguro nativo no está disponible'
    );
  });

  it('3. removes local tokens and revokes refreshToken on backend during logout()', async () => {
    const { mockPlugin, store } = createNativePluginMock({
      psigestor_native_refresh_token_v1: 'active_refresh_token_to_revoke',
    });
    tokenStorage.configurePluginForTesting(mockPlugin, () => true);
    tokenStorage.setAccessToken('active_ram_access_token');

    let logoutCompleted = false;
    authService.logout().subscribe(() => {
      logoutCompleted = true;
    });

    await new Promise((r) => setTimeout(r, 15));

    const logoutReq = httpMock.expectOne((r) => r.url.endsWith('/api/auth/logout'));
    expect(logoutReq.request.body).toEqual({
      refreshToken: 'active_refresh_token_to_revoke',
    });
    logoutReq.flush({ message: 'Sesión cerrada correctamente.' });

    await new Promise((r) => setTimeout(r, 15));

    expect(logoutCompleted).toBe(true);
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(mockPlugin.remove).toHaveBeenCalledWith(
      'psigestor_native_refresh_token_v1',
      false
    );
    expect(store.size).toBe(0);
    expect(authService.currentUser()).toBeNull();
  });

  it('4. recovers session after app restart when RAM is empty by reading native SecureStorage and rotating token', async () => {
    const { mockPlugin, store } = createNativePluginMock({
      psigestor_native_refresh_token_v1: 'stored_native_refresh_v1',
    });
    tokenStorage.configurePluginForTesting(mockPlugin, () => true);
    tokenStorage.setAccessToken(null); // App cold restart -> RAM is empty

    let recoveredUser: unknown = null;
    authService.checkSession().subscribe((u) => {
      recoveredUser = u;
    });

    const meReq = httpMock.expectOne((r) => r.url.endsWith('/api/auth/me'));
    meReq.flush({ authenticated: false, user: null });

    await new Promise((r) => setTimeout(r, 15));

    const refreshReq = httpMock.expectOne((r) => r.url.endsWith('/api/auth/refresh'));
    expect(refreshReq.request.body).toEqual({
      refreshToken: 'stored_native_refresh_v1',
    });

    refreshReq.flush({
      message: 'Sesión renovada correctamente.',
      user: {
        id: 7,
        email: '8959@itescam.edu.mx',
        name: 'Juan Pablo Moo Uc',
        role: 'alumno',
      },
      accessToken: 'rotated_access_token_v2',
      refreshToken: 'rotated_refresh_token_v2',
      expiresIn: 900,
      tokenType: 'Bearer',
    });

    await new Promise((r) => setTimeout(r, 15));

    expect(recoveredUser).toEqual({
      id: 7,
      email: '8959@itescam.edu.mx',
      name: 'Juan Pablo Moo Uc',
      role: 'alumno',
    });
    expect(tokenStorage.getAccessToken()).toBe('rotated_access_token_v2');
    expect(store.get('psigestor_native_refresh_token_v1')).toBe(
      'rotated_refresh_token_v2'
    );
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('5. deduplicates concurrent refresh calls so simultaneous 401s execute only ONE POST /api/auth/refresh', async () => {
    const { mockPlugin, store } = createNativePluginMock({
      psigestor_native_refresh_token_v1: 'single_flight_refresh_v1',
    });
    tokenStorage.configurePluginForTesting(mockPlugin, () => true);

    const results: Array<unknown> = [];
    // Trigger 3 concurrent refresh requests simultaneously
    authService.attemptSilentRefresh().subscribe((u) => results.push(u));
    authService.attemptSilentRefresh().subscribe((u) => results.push(u));
    authService.attemptSilentRefresh().subscribe((u) => results.push(u));

    await new Promise((r) => setTimeout(r, 15));

    // Must have issued ONLY ONE HTTP request to /api/auth/refresh
    const refreshReqs = httpMock.match((r) => r.url.endsWith('/api/auth/refresh'));
    expect(refreshReqs.length).toBe(1);

    refreshReqs[0].flush({
      message: 'Sesión renovada correctamente.',
      user: {
        id: 1,
        email: 'psicologia@itescam.edu.mx',
        name: 'Lic. Psicología',
        role: 'psicologo',
      },
      accessToken: 'dedup_access_v2',
      refreshToken: 'dedup_refresh_v2',
      expiresIn: 900,
      tokenType: 'Bearer',
    });

    await new Promise((r) => setTimeout(r, 15));

    expect(results.length).toBe(3);
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
    expect(tokenStorage.getAccessToken()).toBe('dedup_access_v2');
    expect(store.get('psigestor_native_refresh_token_v1')).toBe('dedup_refresh_v2');
  });
});
