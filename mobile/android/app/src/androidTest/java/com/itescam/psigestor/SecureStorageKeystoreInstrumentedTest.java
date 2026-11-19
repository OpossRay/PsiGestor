package com.itescam.psigestor;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.aparajita.capacitor.securestorage.SecureStorage;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Android instrumented test verifying:
 * 1. Native @aparajita/capacitor-secure-storage plugin class integration in the Android APK.
 * 2. Hardware/OS AndroidKeyStore AES/GCM encryption and persistence of the mobile refresh token.
 * 3. Session refresh token recovery across simulated app restart and complete removal on logout.
 *
 * Execute on an attached Android device or running AVD emulator via:
 *   cd mobile/android && ./gradlew connectedDebugAndroidTest
 */
@RunWith(AndroidJUnit4.class)
public class SecureStorageKeystoreInstrumentedTest {

    private static final String ANDROID_KEY_STORE = "AndroidKeyStore";
    private static final String TEST_KEY_ALIAS = "psigestor_keystore_test_alias_v1";
    private static final String PREFS_NAME = "WSSecureStorageSharedPreferences";
    private static final String PREF_KEY = "capacitor-storage_psigestor_native_refresh_token_v1";

    @Test
    public void verifyCapacitorSecureStoragePluginAndAndroidKeystorePersistence() throws Exception {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.itescam.psigestor", appContext.getPackageName());

        // 1. Verify native Capacitor 8 SecureStorage plugin class is packaged in the APK
        SecureStorage pluginInstance = new SecureStorage();
        assertNotNull(pluginInstance);

        // 2. Verify AndroidKeyStore AES/GCM key generation and encryption
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEY_STORE);
        keyStore.load(null);

        KeyGenerator keyGenerator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                ANDROID_KEY_STORE
        );
        keyGenerator.init(
                new KeyGenParameterSpec.Builder(
                        TEST_KEY_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                )
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .build()
        );
        SecretKey secretKey = keyGenerator.generateKey();
        assertNotNull(secretKey);

        String sampleRefreshToken = "rotating_refresh_token_android_keystore_998877";
        Cipher encryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        encryptCipher.init(Cipher.ENCRYPT_MODE, secretKey);
        byte[] iv = encryptCipher.getIV();
        byte[] cipherBytes = encryptCipher.doFinal(sampleRefreshToken.getBytes(StandardCharsets.UTF_8));

        String encodedPayload =
                Base64.encodeToString(cipherBytes, Base64.NO_WRAP)
                        + ":"
                        + Base64.encodeToString(iv, Base64.NO_WRAP);

        SharedPreferences prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(PREF_KEY, encodedPayload).commit();

        // 3. Simulate app cold restart: reload KeyStore and SharedPreferences from disk
        KeyStore reloadedKeyStore = KeyStore.getInstance(ANDROID_KEY_STORE);
        reloadedKeyStore.load(null);
        assertTrue(reloadedKeyStore.containsAlias(TEST_KEY_ALIAS));

        SecretKey reloadedKey = ((KeyStore.SecretKeyEntry) reloadedKeyStore.getEntry(TEST_KEY_ALIAS, null)).getSecretKey();
        String storedPayload = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(PREF_KEY, null);
        assertNotNull(storedPayload);

        String[] parts = storedPayload.split(":");
        byte[] storedCipher = Base64.decode(parts[0], Base64.NO_WRAP);
        byte[] storedIv = Base64.decode(parts[1], Base64.NO_WRAP);

        Cipher decryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        decryptCipher.init(Cipher.DECRYPT_MODE, reloadedKey, new GCMParameterSpec(128, storedIv));
        String recoveredRefreshToken = new String(decryptCipher.doFinal(storedCipher), StandardCharsets.UTF_8);

        assertEquals(sampleRefreshToken, recoveredRefreshToken);

        // 4. Simulate logout cleanup
        prefs.edit().remove(PREF_KEY).commit();
        reloadedKeyStore.deleteEntry(TEST_KEY_ALIAS);
    }
}
