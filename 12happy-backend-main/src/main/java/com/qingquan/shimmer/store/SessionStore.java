package com.qingquan.shimmer.store;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 内存会话/Ticket 存储。
 *
 * <p>管理三组键值：</p>
 * <table>
 *   <tr><th>Key 前缀</th><th>用途</th><th>TTL</th></tr>
 *   <tr><td>{@code pending:}</td><td>SSO 授权等待态，存 redirectUrl</td><td>5 分钟</td></tr>
 *   <tr><td>{@code ticket:}</td><td>一次性登录票据，存 Shimmer token</td><td>60 秒</td></tr>
 *   <tr><td>{@code session:}</td><td>活跃会话，存 userId + tokens</td><td>30 分钟</td></tr>
 * </table>
 *
 * <p>所有条目具备一次性消费语义（ticket 取后即删），会话除外。</p>
 *
 * <h3>清理策略</h3>
 * 每 60 秒自动扫描过期条目并移除。
 */
@Component
public class SessionStore {

    private static final Logger log = LoggerFactory.getLogger(SessionStore.class);

    /** SSO 授权等待 TTL（毫秒） */
    static final long PENDING_TTL_MS = 5 * 60 * 1000L;

    /** 登录票据 TTL（毫秒） */
    static final long TICKET_TTL_MS = 60 * 1000L;

    /** 会话 TTL（毫秒），默认 30 分钟 */
    static final long SESSION_TTL_MS = 30 * 60 * 1000L;

    // ---- 存储 ----

    /** pending:<requestId> → PendingEntry */
    private final ConcurrentHashMap<String, PendingEntry> pendingRequests = new ConcurrentHashMap<>();

    /** ticket:<ticket> → TicketEntry */
    private final ConcurrentHashMap<String, TicketEntry> loginTickets = new ConcurrentHashMap<>();

    /** session:<sessionToken> → SessionEntry */
    private final ConcurrentHashMap<String, SessionEntry> sessions = new ConcurrentHashMap<>();

    // ==================== Pending（SSO 授权等待） ====================

    /**
     * 保存 SSO 授权等待态，返回 requestId 作为回调关联键。
     */
    public String savePending(String redirectUrl) {
        String requestId = UUID.randomUUID().toString().replace("-", "");
        pendingRequests.put(requestId, new PendingEntry(redirectUrl, System.currentTimeMillis()));
        log.debug("Pending SSO saved: rid={}", requestId);
        return requestId;
    }

    /**
     * 取出并删除 pending 状态。
     *
     * @return redirectUrl，不存在或已过期返回 null
     */
    public String consumePending(String requestId) {
        PendingEntry entry = pendingRequests.remove(requestId);
        if (entry == null) {
            return null;
        }
        if (isExpired(entry.createdAt, PENDING_TTL_MS)) {
            log.debug("Pending SSO expired: rid={}", requestId);
            return null;
        }
        return entry.redirectUrl;
    }

    // ==================== Ticket（一次性登录票据） ====================

    /**
     * 生成一次性登录票据，关联 Shimmer 平台 token 和原始 redirectUrl。
     *
     * @return 12happy 的 ticket（供前端兑换）
     */
    public String createTicket(String platformAccessToken,
                               String platformRefreshToken,
                               String userId,
                               long expiresIn) {
        String ticket = UUID.randomUUID().toString().replace("-", "");
        loginTickets.put(ticket, new TicketEntry(
                platformAccessToken, platformRefreshToken, userId, expiresIn, System.currentTimeMillis()));
        log.debug("Ticket created: {}*** for user {}", ticket.substring(0, 8), userId);
        return ticket;
    }

    /**
     * 一次性消费 ticket，返回关联的 Shimmer 平台 token。消费后 ticket 立即删除。
     *
     * @return TicketEntry，不存在/已过期/已消费返回 null
     */
    public TicketEntry consumeTicket(String ticket) {
        TicketEntry entry = loginTickets.remove(ticket);
        if (entry == null) {
            return null;
        }
        if (isExpired(entry.createdAt, TICKET_TTL_MS)) {
            log.debug("Ticket expired: {}***", ticket.substring(0, Math.min(8, ticket.length())));
            return null;
        }
        log.debug("Ticket consumed: {}*** for user {}", ticket.substring(0, 8), entry.userId);
        return entry;
    }

    // ==================== Session（活跃会话） ====================

    /**
     * 创建会话并返回 session token。
     */
    public String createSession(String userId,
                                String platformAccessToken,
                                String platformRefreshToken) {
        String sessionToken = UUID.randomUUID().toString().replace("-", "");
        sessions.put(sessionToken, new SessionEntry(
                userId, platformAccessToken, platformRefreshToken, System.currentTimeMillis()));
        log.debug("Session created: {}*** for user {}", sessionToken.substring(0, 8), userId);
        return sessionToken;
    }

    /**
     * 根据 session token 解析当前用户 ID。
     *
     * @return userId，会话不存在/过期返回 null
     */
    public String resolveUserId(String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) {
            return null;
        }
        SessionEntry entry = sessions.get(sessionToken);
        if (entry == null) {
            return null;
        }
        if (isExpired(entry.createdAt, SESSION_TTL_MS)) {
            sessions.remove(sessionToken);
            return null;
        }
        // 刷新访问时间（滑动过期）
        entry.touch();
        return entry.userId;
    }

    /**
     * 获取会话关联的 Shimmer access token（用于后端调用 OpenAPI）。
     */
    public String getPlatformAccessToken(String sessionToken) {
        SessionEntry entry = sessions.get(sessionToken);
        return entry != null && !isExpired(entry.createdAt, SESSION_TTL_MS)
                ? entry.platformAccessToken : null;
    }

    /**
     * 销毁会话。
     */
    public void destroySession(String sessionToken) {
        sessions.remove(sessionToken);
        log.debug("Session destroyed: {}***", sessionToken.substring(0, Math.min(8, sessionToken.length())));
    }

    // ==================== 清理 ====================

    @Scheduled(fixedRate = 60_000)
    public void cleanupExpired() {
        long now = System.currentTimeMillis();

        pendingRequests.entrySet().removeIf(e ->
                isExpired(e.getValue().createdAt, PENDING_TTL_MS));

        loginTickets.entrySet().removeIf(e ->
                isExpired(e.getValue().createdAt, TICKET_TTL_MS));

        sessions.entrySet().removeIf(e ->
                isExpired(e.getValue().createdAt, SESSION_TTL_MS));
    }

    // ==================== 内部 ====================

    private static boolean isExpired(long createdAt, long ttlMs) {
        return System.currentTimeMillis() - createdAt > ttlMs;
    }

    // ---- Entry 类型 ----

    static class PendingEntry {
        final String redirectUrl;
        final long createdAt;
        PendingEntry(String redirectUrl, long createdAt) {
            this.redirectUrl = redirectUrl;
            this.createdAt = createdAt;
        }
    }

    /** 登录票据关联的 Shimmer 平台 token */
    public record TicketEntry(
            String platformAccessToken,
            String platformRefreshToken,
            String userId,
            long expiresIn,
            long createdAt
    ) {}

    static class SessionEntry {
        final String userId;
        final String platformAccessToken;
        final String platformRefreshToken;
        volatile long createdAt;  // volatile for touch() visibility

        SessionEntry(String userId, String platformAccessToken,
                    String platformRefreshToken, long createdAt) {
            this.userId = userId;
            this.platformAccessToken = platformAccessToken;
            this.platformRefreshToken = platformRefreshToken;
            this.createdAt = createdAt;
        }

        /** 滑动续期 */
        void touch() {
            this.createdAt = System.currentTimeMillis();
        }
    }
}
