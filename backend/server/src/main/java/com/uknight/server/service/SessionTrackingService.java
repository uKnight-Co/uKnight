package com.uknight.server.service;

import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class SessionTrackingService {

    private final ConcurrentHashMap<String, String> uuidToUserId = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> matchStartTimes = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> activeMatches = new ConcurrentHashMap<>();

    public void registerSession(String uuid, String userId) {
        if (userId != null && !userId.isBlank()) {
            uuidToUserId.put(uuid, userId);
            log.info("Registered session {} -> userId {}", uuid.substring(0, 8), userId.substring(0, 8));
        }
    }

    public String getUserId(String uuid) {
        return uuidToUserId.get(uuid);
    }

    public void recordMatch(String uuid1, String uuid2) {
        Instant now = Instant.now();
        matchStartTimes.put(uuid1, now);
        matchStartTimes.put(uuid2, now);
        activeMatches.put(uuid1, uuid2);
        activeMatches.put(uuid2, uuid1);
    }

    public String getPartnerUuid(String uuid) {
        return activeMatches.get(uuid);
    }

    public long endSession(String uuid) {
        Instant startTime = matchStartTimes.remove(uuid);
        String partnerUuid = activeMatches.remove(uuid);

        if (partnerUuid != null) {
            activeMatches.remove(partnerUuid);
            matchStartTimes.remove(partnerUuid);
        }

        if (startTime == null) {
            return 0;
        }

        long minutes = java.time.Duration.between(startTime, Instant.now()).toMinutes();
        return Math.max(minutes, 1);
    }

    public void removeSession(String uuid) {
        uuidToUserId.remove(uuid);
        matchStartTimes.remove(uuid);
        activeMatches.remove(uuid);
    }
}
