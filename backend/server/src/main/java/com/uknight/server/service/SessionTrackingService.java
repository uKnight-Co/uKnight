package com.uknight.server.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.TimeUnit;

/**
 * Redis-backed session tracking service.
 *
 * Previously used ConcurrentHashMaps which meant:
 * - All session state was lost on server restart.
 * - State could not be shared across multiple server instances (no horizontal scaling).
 *
 * Now uses Redis Hashes and Strings with TTLs:
 * - State survives restarts.
 * - Multiple server instances share the same session state.
 * - Entries automatically expire, preventing memory leaks.
 *
 * Key schema:
 *   session:users           -> Redis Hash { uuid -> userId }
 *   session:matches         -> Redis Hash { uuid -> partnerUuid }
 *   session:start:{uuid}    -> Redis String (epoch millis as string)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SessionTrackingService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String USERS_HASH_KEY    = "session:users";
    private static final String MATCHES_HASH_KEY  = "session:matches";
    private static final String START_KEY_PREFIX  = "session:start:";
    private static final long   SESSION_TTL_HOURS = 2;

    // -------------------------------------------------------------------------
    // Session Registration (uuid <-> userId mapping)
    // -------------------------------------------------------------------------

    public void registerSession(String uuid, String userId) {
        if (userId == null || userId.isBlank()) return;
        redisTemplate.opsForHash().put(USERS_HASH_KEY, uuid, userId);
        // Refresh hash TTL on every registration so active sessions don't expire
        redisTemplate.expire(USERS_HASH_KEY, SESSION_TTL_HOURS, TimeUnit.HOURS);
        log.info("Registered session {} -> userId {}", abbrev(uuid), abbrev(userId));
    }

    public String getUserId(String uuid) {
        Object value = redisTemplate.opsForHash().get(USERS_HASH_KEY, uuid);
        return value != null ? value.toString() : null;
    }

    // -------------------------------------------------------------------------
    // Match Recording (bidirectional uuid <-> partnerUuid, with start time)
    // -------------------------------------------------------------------------

    public void recordMatch(String uuid1, String uuid2) {
        long now = System.currentTimeMillis();

        // Store bidirectional match mapping
        redisTemplate.opsForHash().put(MATCHES_HASH_KEY, uuid1, uuid2);
        redisTemplate.opsForHash().put(MATCHES_HASH_KEY, uuid2, uuid1);
        redisTemplate.expire(MATCHES_HASH_KEY, SESSION_TTL_HOURS, TimeUnit.HOURS);

        // Store match start times as individual keys with TTL
        redisTemplate.opsForValue().set(START_KEY_PREFIX + uuid1, now, SESSION_TTL_HOURS, TimeUnit.HOURS);
        redisTemplate.opsForValue().set(START_KEY_PREFIX + uuid2, now, SESSION_TTL_HOURS, TimeUnit.HOURS);

        log.info("Recorded match {} <-> {}", abbrev(uuid1), abbrev(uuid2));
    }

    public String getPartnerUuid(String uuid) {
        Object value = redisTemplate.opsForHash().get(MATCHES_HASH_KEY, uuid);
        return value != null ? value.toString() : null;
    }

    // -------------------------------------------------------------------------
    // Session End (cleans up match data, returns duration in minutes)
    // -------------------------------------------------------------------------

    public long endSession(String uuid) {
        String partnerUuid = getPartnerUuid(uuid);

        // Clean up both directions of the match mapping
        redisTemplate.opsForHash().delete(MATCHES_HASH_KEY, uuid);
        if (partnerUuid != null) {
            redisTemplate.opsForHash().delete(MATCHES_HASH_KEY, partnerUuid);
        }

        // Retrieve and delete the start time
        Object startVal = redisTemplate.opsForValue().getAndDelete(START_KEY_PREFIX + uuid);
        if (partnerUuid != null) {
            redisTemplate.delete(START_KEY_PREFIX + partnerUuid);
        }

        if (startVal == null) return 0;

        long startMillis = ((Number) startVal).longValue();
        long durationMinutes = (System.currentTimeMillis() - startMillis) / 60_000L;
        return Math.max(durationMinutes, 1);
    }

    // -------------------------------------------------------------------------
    // Full Session Cleanup (called on WebSocket disconnect)
    // -------------------------------------------------------------------------

    public void removeSession(String uuid) {
        redisTemplate.opsForHash().delete(USERS_HASH_KEY, uuid);
        redisTemplate.opsForHash().delete(MATCHES_HASH_KEY, uuid);
        redisTemplate.delete(START_KEY_PREFIX + uuid);
        log.info("Cleaned up session data for {}", abbrev(uuid));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private String abbrev(String s) {
        return s != null && s.length() > 8 ? s.substring(0, 8) : s;
    }
}
