package com.uknight.server.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchmakingService {

    private final SessionTrackingService sessionTrackingService;
    private final UserService userService;
    private final ConcurrentLinkedQueue<String> waitingUsers = new ConcurrentLinkedQueue<>();

    public void addUser(String sessionId) {
        if (!waitingUsers.contains(sessionId)) {
            waitingUsers.add(sessionId);
            log.info("User added to matchmaking queue: {}", sessionId);
        }
    }

    public void removeUser(String sessionId) {
        waitingUsers.remove(sessionId);
        log.info("User removed from matchmaking queue: {}", sessionId);
    }

    public String findMatch(String sessionId) {
        synchronized (waitingUsers) {
           if (waitingUsers.size() < 2) {
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
           for (String waiter : waitingUsers) {
               if (waiter.equals(sessionId)) continue;

               String theirUserId = sessionTrackingService.getUserId(waiter);
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
                   bestMatch = waiter;
               }
           }

           if (bestMatch != null) {
               waitingUsers.remove(bestMatch);
               waitingUsers.remove(sessionId);
               return bestMatch;
           }

           // Fallback to absolute first person if something weird happened
           for (String waiter : waitingUsers) {
               if (!waiter.equals(sessionId)) {
                   waitingUsers.remove(waiter);
                   waitingUsers.remove(sessionId);
                   return waiter;
               }
           }
        }
        return null;
    }
    
    // Better Approach for polling:
    // When a user joins, check if queue has someone.
    // If yes, poll() them -> Match!
    // If no, add myself via offer().
    public String attemptMatch(String sessionId) {
        synchronized (waitingUsers) {
            String partner = waitingUsers.poll();
            
            if (partner != null) {
                // Determine if the partner is still valid/connected? 
                // For now assume yes.
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
