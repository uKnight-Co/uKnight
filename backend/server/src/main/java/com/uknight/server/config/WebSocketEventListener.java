package com.uknight.server.config;

import com.uknight.server.service.MatchmakingService;
import com.uknight.server.service.SessionTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * Listens for WebSocket disconnect events and cleans up all Redis state
 * associated with the disconnected session.
 *
 * This is the critical missing piece that was causing "zombie" users to
 * accumulate in the matchmaking queue — users whose browser closed or
 * connection dropped without a clean /end-session message.
 *
 * Without this listener, a user who hard-refreshes the page would remain
 * in the matchmaking queue indefinitely (until the 5-minute stale prune),
 * meaning other users could be "matched" with a session that no longer exists.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final MatchmakingService matchmakingService;
    private final SessionTrackingService sessionTrackingService;
    private final RedisTemplate<String, Object> redisTemplate;

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        // Prefer the custom UUID header sent by the client; fall back to STOMP session ID
        String sessionId = accessor.getFirstNativeHeader("uuid");
        if (sessionId == null) {
            sessionId = accessor.getSessionId();
        }

        if (sessionId == null) {
            log.warn("Received disconnect event with no identifiable session ID");
            return;
        }

        log.info("WebSocket disconnect detected for session: {}", sessionId);

        // 1. Remove from matchmaking queue (prevents zombie matches)
        matchmakingService.removeUser(sessionId);

        // 2. Decrement the global online counter
        Long onlineCount = redisTemplate.opsForValue().decrement("stats:online_users");
        if (onlineCount != null && onlineCount < 0) {
            // Guard against going negative on startup/restarts
            redisTemplate.opsForValue().set("stats:online_users", 0L);
        }

        // 3. Clean up session tracking data (uuid->userId, match partner, start time)
        sessionTrackingService.removeSession(sessionId);
    }
}
