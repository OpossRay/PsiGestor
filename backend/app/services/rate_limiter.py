from collections import defaultdict
from datetime import datetime, timedelta, timezone
import os
import threading
import time

from app.config import is_production_like
from app.database import get_db_connection


class RateLimitExceededError(Exception):
    def __init__(self, message: str, retry_after_seconds: int):
        super().__init__(message)
        self.retry_after_seconds = max(1, int(retry_after_seconds))


class HybridRateLimiter:
    """
    Rate limiter supporting both:
    1. Multi-instance / multi-worker shared PostgreSQL storage (`auth_rate_limits` table)
       for Render deployments where Gunicorn runs multiple workers or horizontal replicas.
    2. Thread-safe in-memory sliding-window storage as local default and automatic fallback
       if the database is temporarily unreachable.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def _should_use_database(self) -> bool:
        mode = (os.getenv("RATE_LIMIT_STORAGE") or "").strip().lower()
        if mode == "memory":
            return False
        if mode == "database":
            return True
        return False

    def _check_and_record_database(
        self,
        key: str,
        max_attempts: int,
        window_seconds: int,
    ) -> None:
        now_utc = datetime.now(timezone.utc)
        cutoff_utc = now_utc - timedelta(seconds=window_seconds)
        global_retention_Seconds = max(window_seconds * 2, 3600)
        global_cutoff_utc = now_utc - timedelta(seconds=global_retention_Seconds)

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # 1. Prune expired records for the current key AND any stale orphan keys globally
                #    so auth_rate_limits never grows unboundedly across ephemeral IPs.
                cursor.execute(
                    """
                    DELETE FROM auth_rate_limits
                    WHERE (rate_key = %s AND attempted_at <= %s)
                       OR attempted_at <= %s;
                    """,
                    (key, cutoff_utc, global_cutoff_utc),
                )
                cursor.execute(
                    """
                    SELECT COUNT(*), MIN(attempted_at)
                    FROM auth_rate_limits
                    WHERE rate_key = %s AND attempted_at > %s;
                    """,
                    (key, cutoff_utc),
                )
                row = cursor.fetchone()
                count = int(row[0]) if row and row[0] is not None else 0
                oldest_dt = row[1] if row else None

                if count >= max_attempts:
                    connection.commit()
                    if oldest_dt is not None:
                        if oldest_dt.tzinfo is None:
                            oldest_dt = oldest_dt.replace(tzinfo=timezone.utc)
                        elapsed = (now_utc - oldest_dt).total_seconds()
                        retry_after = max(1, int(window_seconds - elapsed) + 1)
                    else:
                        retry_after = window_seconds
                    raise RateLimitExceededError(
                        "Demasiados intentos en poco tiempo. Espera unos segundos antes de intentar nuevamente.",
                        retry_after_seconds=retry_after,
                    )

                cursor.execute(
                    """
                    INSERT INTO auth_rate_limits (rate_key, attempted_at)
                    VALUES (%s, %s);
                    """,
                    (key, now_utc),
                )
                connection.commit()
        except RateLimitExceededError:
            raise
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _check_and_record_memory(
        self,
        key: str,
        max_attempts: int,
        window_seconds: int,
    ) -> None:
        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            if len(self._buckets) > 1000:
                stale_keys = [
                    k for k, ts_list in self._buckets.items()
                    if not ts_list or ts_list[-1] <= cutoff
                ]
                for k in stale_keys:
                    self._buckets.pop(k, None)

            timestamps = [ts for ts in self._buckets[key] if ts > cutoff]
            if len(timestamps) >= max_attempts:
                oldest = timestamps[0]
                retry_after = int((oldest + window_seconds) - now) + 1
                self._buckets[key] = timestamps
                raise RateLimitExceededError(
                    "Demasiados intentos en poco tiempo. Espera unos segundos antes de intentar nuevamente.",
                    retry_after_seconds=retry_after,
                )
            timestamps.append(now)
            self._buckets[key] = timestamps

    def check_and_record(
        self,
        key: str,
        max_attempts: int,
        window_seconds: int,
    ) -> None:
        if self._should_use_database():
            try:
                self._check_and_record_database(key, max_attempts, window_seconds)
                return
            except RateLimitExceededError:
                raise
            except Exception:
                # Fallback to in-memory limiter if DB table is not available yet
                pass

        self._check_and_record_memory(key, max_attempts, window_seconds)

    def reset(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._buckets.clear()
            else:
                self._buckets.pop(key, None)

        if self._should_use_database():
            try:
                connection = get_db_connection()
                try:
                    with connection.cursor() as cursor:
                        if key is None:
                            cursor.execute("DELETE FROM auth_rate_limits;")
                        else:
                            cursor.execute(
                                "DELETE FROM auth_rate_limits WHERE rate_key = %s;",
                                (key,),
                            )
                        connection.commit()
                finally:
                    connection.close()
            except Exception:
                pass


auth_rate_limiter = HybridRateLimiter()


def get_login_rate_limit() -> tuple[int, int]:
    max_attempts = int(os.getenv("AUTH_LOGIN_MAX_ATTEMPTS", "10"))
    window_seconds = int(os.getenv("AUTH_LOGIN_WINDOW_SECONDS", "60"))
    return max_attempts, window_seconds


def get_refresh_rate_limit() -> tuple[int, int]:
    max_attempts = int(os.getenv("AUTH_REFRESH_MAX_ATTEMPTS", "20"))
    window_seconds = int(os.getenv("AUTH_REFRESH_WINDOW_SECONDS", "60"))
    return max_attempts, window_seconds
