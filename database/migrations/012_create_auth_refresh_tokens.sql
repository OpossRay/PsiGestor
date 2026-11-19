-- =============================================================================
-- Migración 012: Tabla de refresh tokens con rotación/revocación para clientes
-- móviles y tabla distribuida de rate limiting para múltiples instancias en Render
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    family_id VARCHAR(36) NOT NULL,
    device_hint VARCHAR(120) NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    replaced_by_hash VARCHAR(64) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
ON auth_refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id
ON auth_refresh_tokens (family_id);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    id BIGSERIAL PRIMARY KEY,
    rate_key VARCHAR(255) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_key_time
ON auth_rate_limits (rate_key, attempted_at);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_attempted_at
ON auth_rate_limits (attempted_at);
