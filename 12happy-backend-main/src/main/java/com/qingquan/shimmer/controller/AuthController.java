package com.qingquan.shimmer.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qingquan.shimmer.client.ShimmerBffClient;
import com.qingquan.shimmer.client.ShimmerOpenApiClient;
import com.qingquan.shimmer.config.ShimmerOpenApiProperties;
import com.qingquan.shimmer.store.SessionStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * SSO 登录 BFF 中转 Controller。
 *
 * <h3>完整流程</h3>
 * <pre>
 * 前端                    本 BFF                      Shimmer BFF
 *  │                         │                            │
 *  │─ GET /api/auth/sso/authorize?redirect_url=X ──▶      │
 *  │                         │─ 302 ──────────────────▶ authorize（SSO）
 *  │                         │                            │
 *  │                         │◀─ 302 callback?ticket=T ──│
 *  │                         │                            │
 *  │                         │─ POST ticket/exchange ──▶  │
 *  │                         │◀──── platform tokens ──────│
 *  │                         │                            │
 *  │◀─── 302 X?ticket=12t ───│                            │
 *  │                         │                            │
 *  │─ POST /api/auth/sso/ticket/exchange {12t} ─▶        │
 *  │◀── {session_token, user_id} ───│                     │
 * </pre>
 *
 * <h3>端点</h3>
 * <table>
 *   <tr><td>GET  /api/auth/sso/authorize</td><td>发起 SSO 登录</td></tr>
 *   <tr><td>GET  /api/auth/sso/callback</td><td>SSO 回调接收（Shimmer BFF 回跳）</td></tr>
 *   <tr><td>POST /api/auth/sso/ticket/exchange</td><td>前端用 ticket 换取会话</td></tr>
 *   <tr><td>GET  /api/auth/user/me</td><td>获取当前用户信息（需 X-Session-Token）</td></tr>
 *   <tr><td>POST /api/auth/logout</td><td>退出登录</td></tr>
 * </table>
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ShimmerBffClient bffClient;
    private final ShimmerOpenApiClient openApiClient;
    private final SessionStore sessionStore;
    private final ShimmerOpenApiProperties properties;

    public AuthController(ShimmerBffClient bffClient,
                          ShimmerOpenApiClient openApiClient,
                          SessionStore sessionStore,
                          ShimmerOpenApiProperties properties) {
        this.bffClient = bffClient;
        this.openApiClient = openApiClient;
        this.sessionStore = sessionStore;
        this.properties = properties;
    }

    // ==================== Step 1: 发起登录 ====================

    /**
     * 发起 SSO 登录。
     *
     * <p>校验 redirect_url 白名单后，302 跳转到 Shimmer BFF 的 SSO 授权端点。
     * Shimmer BFF 的 callback 回跳地址设为本 BFF 的 /api/auth/sso/callback。
     * 同时生成 requestId 关联原始 redirect_url，避免开放重定向。</p>
     *
     * @param redirectUrl 登录完成后前端希望回到的地址（须命中白名单）
     */
    @GetMapping("/sso/authorize")
    public void authorize(@RequestParam(value = "redirect_url", required = false) String redirectUrl,
                          @RequestParam(value = "client_type", defaultValue = "h5") String clientType,
                          HttpServletResponse response) throws IOException {

        // 默认回跳地址
        if (redirectUrl == null || redirectUrl.isBlank()) {
            redirectUrl = "/";
        }

        // 防开放重定向：校验白名单
        if (!isRedirectAllowed(redirectUrl)) {
            response.setStatus(400);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"code\":400,\"msg\":\"redirect_url 不在白名单中\"}");
            return;
        }

        // 保存原始 redirect_url，生成关联 requestId
        String requestId = sessionStore.savePending(redirectUrl);

        // 构造 Shimmer BFF 的 callback URL（指回本 BFF）
        String callbackUrl = properties.getApp().getBaseUrl()
                + "/api/auth/sso/callback?rid=" + requestId;

        // 302 跳转到 Shimmer BFF SSO 授权端点
        String shimmerAuthorizeUrl = properties.getOpenapi().getBaseUrl()
                + "/api/v1/auth/sso/authorize"
                + "?client_type=" + clientType
                + "&redirect_url=" + java.net.URLEncoder.encode(callbackUrl, StandardCharsets.UTF_8);

        log.info("SSO authorize: redirect_url={}, rid={}", redirectUrl, requestId);
        response.sendRedirect(shimmerAuthorizeUrl);
    }

    // ==================== Step 2: SSO 回调 ====================

    /**
     * Shimmer BFF SSO 回调接收端点。
     *
     * <p>Shimmer BFF 完成 SSO 后，302 跳转回到本端点，携带一次性 login ticket。
     * 本端点用 ticket 换取平台 token，生成 12happy 自己的登录票据，
     * 再 302 跳转回前端 redirect_url。</p>
     *
     * @param ticket Shimmer BFF 签发的一次性登录票据
     * @param rid    关联原始前端 redirect_url 的 requestId
     */
    @GetMapping("/sso/callback")
    public void callback(@RequestParam("ticket") String ticket,
                         @RequestParam(value = "rid", required = false) String rid,
                         HttpServletResponse response) throws IOException {

        // 取出原始前端 redirect_url
        String redirectUrl = "/";
        if (rid != null && !rid.isBlank()) {
            String stored = sessionStore.consumePending(rid);
            if (stored != null) {
                redirectUrl = stored;
            }
        }

        try {
            // 用 Shimmer ticket 兑换平台 token
            ShimmerBffClient.TokenResult tokens = bffClient.exchangeTicket(ticket);

            // 生成 12happy 自己的登录票据（一次性）
            String localTicket = sessionStore.createTicket(
                    tokens.platformAccessToken(),
                    tokens.platformRefreshToken(),
                    tokens.userId(),
                    tokens.expiresIn());

            log.info("SSO login success: userId={}, shimmerExpiresIn={}s",
                    tokens.userId(), tokens.expiresIn());

            // 302 回前端，URL 中只暴露一次性 local ticket
            String sep = redirectUrl.contains("?") ? "&" : "?";
            response.sendRedirect(redirectUrl + sep + "ticket=" + localTicket);

        } catch (Exception e) {
            log.error("SSO callback error: {}", e.getMessage(), e);
            String sep = redirectUrl.contains("?") ? "&" : "?";
            response.sendRedirect(redirectUrl + sep + "error=login_failed");
        }
    }

    // ==================== Step 3: 前端兑换会话 ====================

    /**
     * 前端用一次性 ticket 换取会话 token。
     *
     * <p>请求体：{@code {"ticket": "<login_ticket>"}}
     *
     * <p>成功响应 data：</p>
     * <pre>{@code
     * {
     *   "session_token": "...",
     *   "user_id": "usr_xxx",
     *   "expires_in": 1800
     * }
     * }</pre>
     *
     * <p>ticket 一次性消费，消费后立即删除。默认 60 秒过期。</p>
     */
    @PostMapping("/sso/ticket/exchange")
    public Map<String, Object> exchangeTicket(@RequestBody String body) {
        String ticket;
        try {
            JsonNode root = MAPPER.readTree(body);
            ticket = root.has("ticket") ? root.get("ticket").asText() : null;
        } catch (Exception e) {
            throw new IllegalArgumentException("请求体解析失败，需要 {\"ticket\":\"...\"}");
        }

        if (ticket == null || ticket.isBlank()) {
            throw new IllegalArgumentException("ticket 不能为空");
        }

        // 一次性消费 ticket
        SessionStore.TicketEntry entry = sessionStore.consumeTicket(ticket);
        if (entry == null) {
            throw new IllegalArgumentException("ticket 无效、已过期或已使用");
        }

        // 创建服务端会话
        String sessionToken = sessionStore.createSession(
                entry.userId(),
                entry.platformAccessToken(),
                entry.platformRefreshToken());

        log.info("Session created: userId={}, session={}***",
                entry.userId(), sessionToken.substring(0, 8));

        return Map.of(
                "session_token", sessionToken,
                "user_id", entry.userId(),
                "expires_in", 1800
        );
    }

    // ==================== Step 4: 用户信息 / 退出 ====================

    /**
     * 获取当前登录用户的基本信息。
     *
     * <p>通过 {@code X-Session-Token} 头部识别用户，
     * 后端自动用 API Key 签名 + platform token 调用 Shimmer OpenAPI。</p>
     *
     * <p><b>测试用 curl：</b></p>
     * <pre>curl -H "X-Session-Token: &lt;session_token&gt;" http://localhost:5022/api/auth/user/me</pre>
     */
    @GetMapping("/user/me")
    public Map<String, Object> getCurrentUser(HttpServletRequest request) {
        String sessionToken = request.getHeader("X-Session-Token");
        if (sessionToken == null || sessionToken.isBlank()) {
            throw new IllegalArgumentException("缺少 X-Session-Token 请求头");
        }

        String platformToken = sessionStore.getPlatformAccessToken(sessionToken);
        if (platformToken == null) {
            throw new IllegalArgumentException("会话无效或已过期");
        }

        JsonNode userData = openApiClient.getUserBasic(platformToken);
        return MAPPER.convertValue(userData, Map.class);
    }

    /**
     * 退出登录（清除服务端会话）。
     */
    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        String sessionToken = request.getHeader("X-Session-Token");
        if (sessionToken != null && !sessionToken.isBlank()) {
            sessionStore.destroySession(sessionToken);
        }
        return Map.of("msg", "已退出");
    }

    // ==================== 内部 ====================

    /**
     * 校验 redirect_url 是否命中白名单。
     *
     * <p>白名单规则：</p>
     * <ul>
     *   <li>相对路径（如 /login/callback）—— 允许</li>
     *   <li>精确域名匹配</li>
     *   <li>{@code *.example.com} 通配子域名</li>
     * </ul>
     */
    private boolean isRedirectAllowed(String url) {
        // 相对路径直接允许
        if (url.startsWith("/") && !url.startsWith("//")) {
            return true;
        }

        // 拒绝协议相对 URL（//evil.com/...）
        if (url.startsWith("//")) {
            return false;
        }

        String whitelist = properties.getApp().getRedirectWhitelist();
        if (whitelist == null || whitelist.isBlank()) {
            return false;
        }

        List<String> allowed = Arrays.stream(whitelist.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        for (String pattern : allowed) {
            if (url.startsWith(pattern)) {
                return true;
            }
            // 通配符域名匹配 *.example.com
            if (pattern.startsWith("*.")) {
                String domain = pattern.substring(1); // .example.com
                try {
                    String host = java.net.URI.create(url).toURL().getHost();
                    if (host != null && (host.endsWith(domain) || host.equals(pattern.substring(2)))) {
                        return true;
                    }
                } catch (Exception ignored) {
                    // URL 解析失败，跳过
                }
            }
        }
        return false;
    }
}
