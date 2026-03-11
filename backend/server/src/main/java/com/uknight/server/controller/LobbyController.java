package com.uknight.server.controller;

import com.uknight.server.service.GameService;
import com.uknight.server.service.MatchmakingService;
import com.uknight.server.service.SessionTrackingService;
import com.uknight.server.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;

@Slf4j
@Controller
@RequiredArgsConstructor
public class LobbyController {

    private final MatchmakingService matchmakingService;
    private final GameService gameService;
    private final SimpMessagingTemplate messagingTemplate;
    private final SessionTrackingService sessionTrackingService;
    private final UserService userService;

    @SuppressWarnings("unchecked")
    @MessageMapping("/join")
    public void joinLobby(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getFirstNativeHeader("uuid");
        if (sessionId == null) {
            sessionId = headerAccessor.getSessionId();
        }

        String university = String.valueOf(payload.getOrDefault("university", "Unknown"));
        String firebaseUid = (String) payload.get("userId");

        log.info("Student joined the lobby from: {} (UUID: {}, userId: {})", university, sessionId, firebaseUid);

        if (firebaseUid != null && !firebaseUid.isBlank()) {
            sessionTrackingService.registerSession(sessionId, firebaseUid);
        }

        Object prefsObj = payload.get("preferences");
        if (prefsObj instanceof List<?>) {
            Set<String> prefs = new HashSet<>((List<String>) prefsObj);
            matchmakingService.setUserPreferences(sessionId, prefs);
            log.info("User {} has preferences: {}", sessionId, prefs);
        }

        matchmakingService.addUser(sessionId);

        String partnerSessionId = matchmakingService.findMatch(sessionId);

        if (partnerSessionId != null) {
            log.info("Match created: {} and {}", sessionId, partnerSessionId);

            sessionTrackingService.recordMatch(sessionId, partnerSessionId);

            String userId1 = sessionTrackingService.getUserId(sessionId);
            String userId2 = sessionTrackingService.getUserId(partnerSessionId);
            if (userId1 != null) userService.incrementPeopleMet(userId1);
            if (userId2 != null) userService.incrementPeopleMet(userId2);

            Object payload1 = Map.of("peerId", partnerSessionId, "initiator", true);
            messagingTemplate.convertAndSend("/topic/match/" + sessionId, payload1);

            Object payload2 = Map.of("peerId", sessionId, "initiator", false);
            messagingTemplate.convertAndSend("/topic/match/" + partnerSessionId, payload2);
        }
    }

    @MessageMapping("/end-session")
    public void endSession(SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getFirstNativeHeader("uuid");
        if (sessionId == null) {
            sessionId = headerAccessor.getSessionId();
        }

        log.info("Session ended for UUID: {}", sessionId);

        String partnerUuid = sessionTrackingService.getPartnerUuid(sessionId);
        long minutes = sessionTrackingService.endSession(sessionId);

        String userId = sessionTrackingService.getUserId(sessionId);
        if (userId != null && minutes > 0) {
            userService.addTimeSpent(userId, minutes);
        }

        if (partnerUuid != null) {
            String partnerUserId = sessionTrackingService.getUserId(partnerUuid);
            if (partnerUserId != null && minutes > 0) {
                userService.addTimeSpent(partnerUserId, minutes);
            }
        }
    }

    // Frontend sends to: /app/signal
    // Payload should contain: { "type": "offer/answer/ice", "data": "...", "targetPeerId": "..." }
    @MessageMapping("/signal")
    public void handleSignal(@Payload Map<String, Object> signal, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = headerAccessor.getFirstNativeHeader("uuid");
        if (senderId == null) {
             senderId = headerAccessor.getSessionId();
        }
        
        String targetPeerId = (String) signal.get("targetPeerId");
        
        log.info("Signal {} from {} to {}", signal.get("type"), senderId, targetPeerId);
        
        if (targetPeerId != null) {
            // Forward the signal to the specific user
            // We strip 'targetPeerId' and add 'senderId' so the receiver knows who sent it
            signal.put("senderId", senderId);
            Object signalPayload = signal;
            messagingTemplate.convertAndSend("/topic/signal/" + targetPeerId, signalPayload);
        }
    }
    // Frontend sends to: /app/chat
    // Payload should contain: { "targetPeerId": "...", "message": "..." }
    @MessageMapping("/chat")
    public void handleChat(@Payload Map<String, String> chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = headerAccessor.getFirstNativeHeader("uuid");
        if (senderId == null) {
             senderId = headerAccessor.getSessionId();
        }

        String targetPeerId = chatMessage.get("targetPeerId");
        String messageContent = chatMessage.get("message");

        log.info("Chat message from {} to {}: {}", senderId, targetPeerId, messageContent);

        if (targetPeerId != null && messageContent != null) {
            // Forward the signal to the specific user
            // We include 'senderId' so the receiver knows who sent it
            Object payload = Map.of("senderId", senderId, "message", messageContent);
            messagingTemplate.convertAndSend("/topic/chat/" + targetPeerId, payload);
        }
    }

    // ========================
    // GAME MESSAGE HANDLERS
    // ========================

    @MessageMapping("/game/invite")
    public void handleGameInvite(@Payload Map<String, String> inviteData, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = headerAccessor.getFirstNativeHeader("uuid");
        if (senderId == null) {
            senderId = headerAccessor.getSessionId();
        }

        String targetPeerId = inviteData.get("targetPeerId");
        String gameType = inviteData.get("gameType");

        log.info("Game invite from {} to {} for type: {}", senderId, targetPeerId, gameType);
        
        // Confirmation to sender
        Map<String, Object> confirmPayload = new HashMap<>();
        confirmPayload.put("type", "GAME_INVITE_SENT_CONFIRM");
        confirmPayload.put("targetPeerId", targetPeerId);
        messagingTemplate.convertAndSend("/topic/game/" + senderId, (Object) confirmPayload);

        if (targetPeerId != null) {
            String matchId = UUID.randomUUID().toString();
            Map<String, Object> payload = new HashMap<>();
            payload.put("senderId", senderId);
            payload.put("gameType", gameType);
            payload.put("matchId", matchId);
            payload.put("type", "GAME_INVITE");

            messagingTemplate.convertAndSend("/topic/game/" + targetPeerId, (Object) payload);
        }
    }

    // Frontend sends to: /app/game/accept
    // Payload should contain: { "targetPeerId": "...", "matchId": "..." }
    @MessageMapping("/game/accept")
    public void handleGameAccept(@Payload Map<String, String> acceptData, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = headerAccessor.getFirstNativeHeader("uuid");
        if (senderId == null) {
             senderId = headerAccessor.getSessionId();
        }

        String targetPeerId = acceptData.get("targetPeerId");
        String matchId = acceptData.get("matchId");

        log.info("Game accept from {} to {} for match: {}", senderId, targetPeerId, matchId);

        if (targetPeerId != null && matchId != null) {
            // Create the game in the service
            gameService.createGame(matchId, targetPeerId, senderId);

            // Notify both players that game started
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "GAME_START");
            payload.put("matchId", matchId);

            messagingTemplate.convertAndSend("/topic/game/" + targetPeerId, (Object) payload);
            messagingTemplate.convertAndSend("/topic/game/" + senderId, (Object) payload);
        }
    }

    // Frontend sends to: /app/game/move
    // Payload should contain: { "matchId": "...", "dx": 0.0, "dy": 0.0 }
    @MessageMapping("/game/move")
    public void handleGameMove(@Payload Map<String, Object> moveData, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = headerAccessor.getFirstNativeHeader("uuid");
        if (senderId == null) {
             senderId = headerAccessor.getSessionId();
        }

        String matchId = (String) moveData.get("matchId");
        Double dx = ((Number) moveData.get("dx")).doubleValue();
        Double dy = ((Number) moveData.get("dy")).doubleValue();

        log.info("Game move from {} for match {}: dx={}, dy={}", senderId, matchId, dx, dy);

        if (matchId != null) {
            // Processing logic
            var gameOpt = gameService.getGame(matchId);
            if (gameOpt.isPresent()) {
                GameService.GameState game = gameOpt.get();
                String opponentId = senderId.equals(game.getPlayer1Id()) ? game.getPlayer2Id() : game.getPlayer1Id();
                
                Map<String, Object> moveBroadcast = new HashMap<>(moveData);
                moveBroadcast.put("type", "GAME_MOVE_ANNOUNCE");
                moveBroadcast.put("senderId", senderId);

                messagingTemplate.convertAndSend("/topic/game/" + senderId, (Object) moveBroadcast);
                messagingTemplate.convertAndSend("/topic/game/" + opponentId, (Object) moveBroadcast);
            }

            // Process the shot through the game service (updates state)
            GameService.GameState gameState = gameService.processShot(matchId, senderId, new GameService.Shot(dx, dy));

            if (gameState != null) {
                // Broadcast final game state to both players (for reconciliation)
                Map<String, Object> statePayload = new HashMap<>();
                statePayload.put("type", "GAME_STATE_SYNC");
                statePayload.put("matchId", matchId);
                statePayload.put("pucks", serializePucks(gameState.getPucks()));
                statePayload.put("currentTurn", gameState.getCurrentTurn());
                statePayload.put("player1Score", gameState.getPlayer1Score());
                statePayload.put("player2Score", gameState.getPlayer2Score());
                statePayload.put("round", gameState.getRound());
                statePayload.put("roundOver", gameState.isRoundOver());
                statePayload.put("winner", gameState.getWinner());

                messagingTemplate.convertAndSend("/topic/game/" + gameState.getPlayer1Id(), (Object) statePayload);
                messagingTemplate.convertAndSend("/topic/game/" + gameState.getPlayer2Id(), (Object) statePayload);
            }
        }
    }

    // Frontend sends to: /app/game/close
    // Payload should contain: { "matchId": "..." }
    @MessageMapping("/game/close")
    public void handleGameClose(@Payload Map<String, String> closeData, SimpMessageHeaderAccessor headerAccessor) {
        String senderId = headerAccessor.getFirstNativeHeader("uuid");
        if (senderId == null) {
             senderId = headerAccessor.getSessionId();
        }

        String matchId = closeData.get("matchId");

        log.info("Game close from {} for match: {}", senderId, matchId);

        if (matchId != null) {
            // Get the game to find the opponent
            var gameOpt = gameService.getGame(matchId);
            if (gameOpt.isPresent()) {
                GameService.GameState gameState = gameOpt.get();
                String opponentId = senderId.equals(gameState.getPlayer1Id())
                    ? gameState.getPlayer2Id()
                    : gameState.getPlayer1Id();

                // Notify opponent that game was closed
                Map<String, Object> payload = new HashMap<>();
                payload.put("type", "GAME_CLOSED");
                payload.put("matchId", matchId);
                messagingTemplate.convertAndSend("/topic/game/" + opponentId, (Object) payload);
            }

            // Remove the game
            gameService.removeGame(matchId);
        }
    }

    // Helper method to serialize pucks for JSON
    private Object[] serializePucks(GameService.Puck[] pucks) {
        if (pucks == null) return new Object[0];

        Object[] result = new Object[pucks.length];
        for (int i = 0; i < pucks.length; i++) {
            if (pucks[i] != null) {
                Map<String, Object> puckData = new HashMap<>();
                puckData.put("x", pucks[i].x);
                puckData.put("y", pucks[i].y);
                puckData.put("radius", pucks[i].radius);
                puckData.put("vx", pucks[i].vx);
                puckData.put("vy", pucks[i].vy);
                result[i] = puckData;
            } else {
                result[i] = null;
            }
        }
        return result;
    }
}
