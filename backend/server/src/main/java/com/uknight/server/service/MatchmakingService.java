package com.uknight.server.service;

import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.RedisTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchmakingService {

    private final SessionTrackingService sessionTrackingService;
    private final UserService userService;
    private final RedisTemplate<String, Object> redisTemplate;
    
    private static final String MATCHMAKING_QUEUE_KEY = "matchmaking:queue";
    private static final long SESSION_TIMEOUT_SECONDS = 300; // 5 minutes

    public void addUser(String sessionId) {
        // Check if already in queue
        if (Boolean.TRUE.equals(redisTemplate.hasKey(MATCHMAKING_QUEUE_KEY))) {
            Set<Object> members = redisTemplate.opsForSet().members(MATCHMAKING_QUEUE_KEY);
            if (members != null && members.contains(sessionId)) {
                return;
            }
        }
        
        // Add to Redis set with expiration
        redisTemplate.opsForSet().add(MATCHMAKING_QUEUE_KEY, sessionId);
        // Set individual expiration key for tracking
        redisTemplate.opsForValue().set(
            "matchmaking:session:" + sessionId, 
            System.currentTimeMillis(), 
            SESSION_TIMEOUT_SECONDS, 
            TimeUnit.SECONDS
        );
        log.info("User added to matchmaking queue: {}", sessionId);
    }

    public void removeUser(String sessionId) {
        redisTemplate.opsForSet().remove(MATCHMAKING_QUEUE_KEY, sessionId);
        redisTemplate.delete("matchmaking:session:" + sessionId);
        log.info("User removed from matchmaking queue: {}", sessionId);
    }

    public String findMatch(String sessionId) {
        Set<Object> waitingUsers = redisTemplate.opsForSet().members(MATCHMAKING_QUEUE_KEY);
        
        if (waitingUsers == null || waitingUsers.size() < 2) {
            return null;
        }
        
        String myUserId = sessionTrackingService.getUserId(sessionId);
        List<String> myInterests = List.of();
        if (myUserId != null) {
            myInterests = userService.getUserById(myUserId)
                .map(u -> u.getInterests() != null ? u.getInterests() : List.<String>of())
                .orElse(List.of());
        }

        String bestMatch = null;
        int maxShared = -1;

        // Try to find someone with shared interests
        for (Object waiter : waitingUsers) {
            String waiterSessionId = (String) waiter;
            if (waiterSessionId.equals(sessionId)) continue;

            String theirUserId = sessionTrackingService.getUserId(waiterSessionId);
            List<String> theirInterests = List.of();
            if (theirUserId != null) {
                theirInterests = userService.getUserById(theirUserId)
                    .map(u -> u.getInterests() != null ? u.getInterests() : List.<String>of())
                    .orElse(List.of());
            }

            int shared = 0;
            for (String interest : myInterests) {
                if (theirInterests.contains(interest)) shared++;
            }

            if (shared > maxShared) {
                maxShared = shared;
                bestMatch = waiterSessionId;
            }
        }

        if (bestMatch != null) {
            redisTemplate.opsForSet().remove(MATCHMAKING_QUEUE_KEY, bestMatch);
            redisTemplate.opsForSet().remove(MATCHMAKING_QUEUE_KEY, sessionId);
            redisTemplate.delete("matchmaking:session:" + bestMatch);
            redisTemplate.delete("matchmaking:session:" + sessionId);
            return bestMatch;
        }

        // Fallback to first person if no shared interests found
        for (Object waiter : waitingUsers) {
            String waiterSessionId = (String) waiter;
            if (!waiterSessionId.equals(sessionId)) {
                redisTemplate.opsForSet().remove(MATCHMAKING_QUEUE_KEY, waiterSessionId);
                redisTemplate.opsForSet().remove(MATCHMAKING_QUEUE_KEY, sessionId);
                redisTemplate.delete("matchmaking:session:" + waiterSessionId);
                redisTemplate.delete("matchmaking:session:" + sessionId);
                return waiterSessionId;
            }
        }
        return null;
    }
    
    public String attemptMatch(String sessionId) {
        Set<Object> waitingUsers = redisTemplate.opsForSet().members(MATCHMAKING_QUEUE_KEY);
        
        if (waitingUsers == null || waitingUsers.isEmpty()) {
            // No one waiting, add this user
            addUser(sessionId);
            log.info("No match found, added {} to queue", sessionId);
            return null;
        }

        // Try to match with first available user
        for (Object waiter : waitingUsers) {
            String waiterSessionId = (String) waiter;
            if (!waiterSessionId.equals(sessionId)) {
                // Found a match
                redisTemplate.opsForSet().remove(MATCHMAKING_QUEUE_KEY, waiterSessionId);
                redisTemplate.opsForSet().remove(MATCHMAKING_QUEUE_KEY, sessionId);
                redisTemplate.delete("matchmaking:session:" + waiterSessionId);
                redisTemplate.delete("matchmaking:session:" + sessionId);
                log.info("Match found: {} <-> {}", sessionId, waiterSessionId);
                return waiterSessionId;
            }
        }
        
        // If only this user exists, add them
        addUser(sessionId);
        return null;
    }
    
    public Long getQueueSize() {
        return redisTemplate.opsForSet().size(MATCHMAKING_QUEUE_KEY);
    }
}
