package com.qingquan.session;

import lombok.Data;

@Data
public class UserSession {
    private final String userId;
    private final String platformAccessToken;
    private final String platformRefreshToken;
    private final long expiresAt;

    public UserSession(String userId, String platformAccessToken, String platformRefreshToken, long expiresInSeconds) {
        this.userId = userId;
        this.platformAccessToken = platformAccessToken;
        this.platformRefreshToken = platformRefreshToken;
        this.expiresAt = System.currentTimeMillis() + expiresInSeconds * 1000;
    }

    public boolean isExpired() {
        return System.currentTimeMillis() > expiresAt;
    }
}
