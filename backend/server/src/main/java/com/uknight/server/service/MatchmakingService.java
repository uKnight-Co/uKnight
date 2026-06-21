package com.uknight.server.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Set;

/**
 * Redis-backed matchmaking queue using a Sorted Set (ZSET).
 *
 * Key design decisions:
 *
 * 1. ZSET instead of SET: The score is the join-timestamp (epoch millis).
 *    This gives FIFO ordering for free — the user who has waited the longest
 *    is always at the lowest score and gets matched first.
 *
 * 2. Lua script for atomic pop-and-match: The two-step "fetch then remove"
 *    pattern has a race condition — two concurrent threads can both see the
 *    same waiter and try to match with them, causing a broken one-sided match.
 *    A Lua script executes atomically on the Redis server, so only one thread
 *    ever wins the "pop" for a given waiter.
 *
 * 3. No separate session tracking key: The timestamp score IS the join time.
 *    We use ZREMRANGEBYSCORE to prune stale entries (zombie users whose
 *    connection dropped before the WebSocketEventListener fired).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MatchmakingService {

    private final SessionTrackingService sessionTrackingService;
    private final UserService userService;
    private final RedisTemplate<String, Object> redisTemplate;

    static final String QUEUE_KEY = "matchmaking:queue";
    private static final long SESSION_TIMEOUT_SECONDS = 300; // 5 minutes

    /**
     * Lua script that atomically:
     * 1. Finds the oldest member of the queue (lowest score) that is NOT the current session.
     * 2. Removes both the found waiter AND the current session from the queue.
     * 3. Returns the waiter's session ID, or nil if no match was found.
     *
     * KEYS[1] = queue key (e.g. "matchmaking:queue")
     * ARGV[1] = the calling session's ID (excluded from match candidates)
     */
    private static final DefaultRedisScript<String> ATOMIC_MATCH_SCRIPT = new DefaultRedisScript<>(
        """
        local members = redis.call('ZRANGE', KEYS[1], 0, -1)
        for _, member in ipairs(members) do
            if member ~= ARGV[1] then
                redis.call('ZREM', KEYS[1], member)
                redis.call('ZREM', KEYS[1], ARGV[1])
                return member
            end
        end
        return nil
        """,
        String.class
    );

    /**
     * Main entry point called by LobbyController on /join.
     *
     * First prunes zombie users, then attempts an atomic match.
     * If no partner is found, adds this user to the queue and returns null.
     */
    public String attemptMatch(String sessionId) {
        pruneStaleEntries();

        // Try to atomically claim a waiting partner
        String partner = redisTemplate.execute(
            ATOMIC_MATCH_SCRIPT,
            List.of(QUEUE_KEY),
            sessionId
        );

        if (partner != null) {
            log.info("Match found via atomic script: {} <-> {}", sessionId, partner);
            return partner;
        }

        // No partner available — add self to queue with current timestamp as score
        double score = System.currentTimeMillis();
        redisTemplate.opsForZSet().add(QUEUE_KEY, sessionId, score);
        log.info("No match found, added {} to queue (score={})", sessionId, (long) score);
        return null;
    }

    /**
     * Explicitly remove a user from the queue (called on disconnect or session end).
     */
    public void removeUser(String sessionId) {
        Long removed = redisTemplate.opsForZSet().remove(QUEUE_KEY, sessionId);
        if (removed != null && removed > 0) {
            log.info("Removed {} from matchmaking queue on disconnect", sessionId);
        }
    }

    /**
     * Returns the current number of users waiting in the matchmaking queue.
     * Used by StatsController.
     */
    public Long getQueueSize() {
        return redisTemplate.opsForZSet().size(QUEUE_KEY);
    }

    /**
     * Removes users from the queue whose join-timestamp score is older than
     * SESSION_TIMEOUT_SECONDS. This is the safety net for zombie entries
     * that slip past the WebSocketEventListener (e.g. network-level drops).
     *
     * ZREMRANGEBYSCORE is an O(log N + M) server-side operation — no data
     * is transferred to the application, making it very efficient.
     */
    private void pruneStaleEntries() {
        long cutoff = System.currentTimeMillis() - (SESSION_TIMEOUT_SECONDS * 1000);
        Long pruned = redisTemplate.opsForZSet().removeRangeByScore(
            QUEUE_KEY,
            Double.NEGATIVE_INFINITY,
            cutoff
        );
        if (pruned != null && pruned > 0) {
            log.warn("Pruned {} stale/zombie entries from matchmaking queue", pruned);
        }
    }
}
