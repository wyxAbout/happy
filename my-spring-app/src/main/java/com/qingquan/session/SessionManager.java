package com.qingquan.session;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SessionManager {

    private final Map<String, UserSession> sessions = new ConcurrentHashMap<>();

    public String createSession(String userId, String platformAccessToken, String platformRefreshToken, long expiresInSeconds) {
        String sessionToken = UUID.randomUUID().toString();
        UserSession session = new UserSession(userId, platformAccessToken, platformRefreshToken, expiresInSeconds);
        sessions.put(sessionToken, session);
        log.info("Session created for userId={}, token={}...", userId, sessionToken.substring(0, 8));
        return sessionToken;
    }

    public UserSession getSession(String sessionToken) {
        UserSession session = sessions.get(sessionToken);
        if (session == null) {
            return null;
        }
        if (session.isExpired()) {
            sessions.remove(sessionToken);
            return null;
        }
        return session;
    }

    public void removeSession(String sessionToken) {
        sessions.remove(sessionToken);
    }

    @Scheduled(fixedRate = 300000)
    public void cleanExpiredSessions() {
        sessions.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
}
