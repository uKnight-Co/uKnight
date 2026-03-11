package com.uknight.server.service;

import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Slf4j
@Service
public class MatchmakingService {

    private final ConcurrentLinkedQueue<String> waitingUsers = new ConcurrentLinkedQueue<>();
    private final ConcurrentHashMap<String, Set<String>> userPreferences = new ConcurrentHashMap<>();

    public void addUser(String sessionId) {
        if (!waitingUsers.contains(sessionId)) {
            waitingUsers.add(sessionId);
            log.info("User added to matchmaking queue: {}", sessionId);
        }
    }

    public void setUserPreferences(String sessionId, Set<String> preferences) {
        if (preferences != null && !preferences.isEmpty()) {
            userPreferences.put(sessionId, preferences);
        }
    }

    public void removeUser(String sessionId) {
        waitingUsers.remove(sessionId);
        userPreferences.remove(sessionId);
        log.info("User removed from matchmaking queue: {}", sessionId);
    }

    public String findMatch(String sessionId) {
        synchronized (waitingUsers) {
            if (waitingUsers.size() < 2) {
                return null;
            }

            Set<String> myPrefs = userPreferences.getOrDefault(sessionId, Collections.emptySet());

            // First pass: find someone with shared preferences
            String bestMatch = null;
            int bestOverlap = 0;

            if (!myPrefs.isEmpty()) {
                for (String waiter : waitingUsers) {
                    if (waiter.equals(sessionId)) continue;
                    Set<String> theirPrefs = userPreferences.getOrDefault(waiter, Collections.emptySet());
                    if (theirPrefs.isEmpty()) continue;

                    int overlap = 0;
                    for (String pref : myPrefs) {
                        if (theirPrefs.contains(pref)) overlap++;
                    }
                    if (overlap > bestOverlap) {
                        bestOverlap = overlap;
                        bestMatch = waiter;
                    }
                }
            }

            // If preference match found, use it; otherwise fall back to first available
            if (bestMatch != null) {
                log.info("Preference match found ({} shared): {} <-> {}", bestOverlap, sessionId, bestMatch);
                waitingUsers.remove(bestMatch);
                waitingUsers.remove(sessionId);
                userPreferences.remove(bestMatch);
                userPreferences.remove(sessionId);
                return bestMatch;
            }

            // Fallback: random/FIFO match
            for (String waiter : waitingUsers) {
                if (!waiter.equals(sessionId)) {
                    waitingUsers.remove(waiter);
                    waitingUsers.remove(sessionId);
                    userPreferences.remove(waiter);
                    userPreferences.remove(sessionId);
                    return waiter;
                }
            }
        }
        return null;
    }

    public String attemptMatch(String sessionId) {
        synchronized (waitingUsers) {
            String partner = waitingUsers.poll();

            if (partner != null) {
                log.info("Match found: {} <-> {}", sessionId, partner);
                return partner;
            } else {
                waitingUsers.add(sessionId);
                log.info("No match found, added {} to queue. Queue size: {}", sessionId, waitingUsers.size());
                return null;
            }
        }
    }
}
