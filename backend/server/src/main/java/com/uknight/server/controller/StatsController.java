package com.uknight.server.controller;

import com.uknight.server.service.MatchmakingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Exposes real-time platform statistics backed entirely by Redis counters.
 *
 * All endpoints are O(1) Redis reads — no database queries, no aggregation.
 * This is one of the key advantages of using Redis for live operational data:
 * a counter that would require a COUNT(*) on a users table instead comes back
 * in microseconds from a Redis INCR/DECR key.
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final RedisTemplate<String, Object> redisTemplate;
    private final MatchmakingService matchmakingService;

    /**
     * GET /api/stats/online
     *
     * Returns the number of currently connected WebSocket users.
     * The counter is maintained by:
     *   - LobbyController.joinLobby()  -> INCR stats:online_users
     *   - WebSocketEventListener       -> DECR stats:online_users
     *   - LobbyController.endSession() -> DECR stats:online_users
     */
    @GetMapping("/online")
    public ResponseEntity<Map<String, Object>> getOnlineStats() {
        Object rawCount = redisTemplate.opsForValue().get("stats:online_users");
        long onlineUsers = rawCount != null ? ((Number) rawCount).longValue() : 0L;
        // Ensure we never report a negative number (possible after restart)
        onlineUsers = Math.max(onlineUsers, 0L);

        Long queueSize = matchmakingService.getQueueSize();

        return ResponseEntity.ok(Map.of(
            "onlineUsers",   onlineUsers,
            "waitingToMatch", queueSize != null ? queueSize : 0L
        ));
    }
}
