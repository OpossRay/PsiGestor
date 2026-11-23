import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  KeychainAccess,
  SecureStorage,
  type SecureStoragePlugin,
} from '@aparajita/capacitor-secure-storage';

const REFRESH_TOKEN_SECURE_KEY = 'psigestor_native_refresh_token_v1';

export class SecureStorageUnavailableError extends Error {
  readonly code = 'SECURE_STORAGE_UNAVAILABLE';

  constructor(
    message = 'No se pudo acceder al almacenamiento seguro del dispositivo (Android Keystore / iOS Keychain). Por seguridad, inicia sesión nuevamente.'
  ) {
    super(message);
    this.name = 'SecureStorageUnavailableError';
  }
}

/**
 * Security policy for mobile credentials:
 * 1. Short-lived accessToken (15 min) is kept EXCLUSIVELY in RAM (`inMemoryAccessToken`).
 * 2. Rotating refreshToken (14 days) is stored ONLY in native hardware-backed storage
 *    via `@aparajita/capacitor-secure-storage` (Android Keystore AES/GCM + iOS Keychain).
 * 3. NEVER falls back to window.localStorage, window.sessionStorage, or fake in-memory
 *    persistence for refresh tokens. If native SecureStorage is unavailable or fails,
 *    throws SecureStorageUnavailableError so the app informs the user and requests re-authentication.
 */
export type SecureStorageOperations = Pick<
  SecureStoragePlugin,
  'get' | 'set' | 'remove'
>;

@Injectable({
  providedIn: 'root',
})
export class SecureTokenStorageService {
  private inMemoryAccessToken: string | null = null;
  private plugin: SecureStorageOperations = SecureStorage;

  /**
   * Allows tests to inject a spy/mock for the native plugin or platform availability check.
   */
  configurePluginForTesting(
    customPlugin: SecureStorageOperations,
    nativeAvailableOverride?: () => boolean
  ): void {
    this.plugin = customPlugin;
    if (nativeAvailableOverride) {
      this.isNativeSecureStorageAvailable = nativeAvailableOverride;
    }
  }

  isNativeSecureStorageAvailable(): boolean {
    return (
      Capacitor.isNativePlatform() &&
      Capacitor.isPluginAvailable('SecureStorage')
    );
  }

  getAccessToken(): string | null {
    return this.inMemoryAccessToken;
  }

  setAccessToken(token: string | null | undefined): void {
    this.inMemoryAccessToken =
      token && typeof token === 'string' && token.trim().length > 0
        ? token.trim()
        : null;
  }

  async getRefreshToken(): Promise<string | null> {
    if (!this.isNativeSecureStorageAvailable()) {
      throw new SecureStorageUnavailableError(
        'No se puede restaurar la sesión porque el almacenamiento seguro nativo no está disponible. Por favor, inicia sesión nuevamente.'
      );
    }

    try {
      const value = await this.plugin.get(
        REFRESH_TOKEN_SECURE_KEY,
        false,
        false
      );
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      return null;
    } catch {
      throw new SecureStorageUnavailableError(
        'Error al leer las credenciales del almacenamiento seguro del dispositivo. Por favor, inicia sesión nuevamente.'
      );
    }
  }

  async setRefreshToken(token: string | null | undefined): Promise<void> {
    const cleanToken =
      token && typeof token === 'string' && token.trim().length > 0
        ? token.trim()
        : null;

    if (!cleanToken) {
      await this.removeRefreshToken();
      return;
    }

    if (!this.isNativeSecureStorageAvailable()) {
      throw new SecureStorageUnavailableError(
        'El almacenamiento seguro nativo no está disponible para persistir la sesión.'
      );
    }

    try {
      await this.plugin.set(
        REFRESH_TOKEN_SECURE_KEY,
        cleanToken,
        false,
        false,
        KeychainAccess.afterFirstUnlockThisDeviceOnly
      );
    } catch {
      throw new SecureStorageUnavailableError(
        'No fue posible guardar la sesión en el almacenamiento seguro del dispositivo.'
      );
    }
  }

  async removeRefreshToken(): Promise<void> {
    if (!this.isNativeSecureStorageAvailable()) {
      return;
    }
    try {
      await this.plugin.remove(REFRESH_TOKEN_SECURE_KEY, false);
    } catch {
      // Ignore if key was already absent
    }
  }

  async clearAllTokens(): Promise<void> {
    this.inMemoryAccessToken = null;
    await this.removeRefreshToken();
  }
}
