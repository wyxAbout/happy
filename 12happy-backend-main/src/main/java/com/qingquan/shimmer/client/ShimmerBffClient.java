package com.qingquan.shimmer.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.qingquan.shimmer.config.ShimmerOpenApiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;

/**
 * Shimmer BFF 客户端 —— 无签名的浏览器端接口。
 *
 * <p>调用 Shimmer App/Admin BFF 的公开端点（无需 API Key / 签名），
 * 主要用于 SSO 登录 ticket 流程。</p>
 *
 * <h3>端点</h3>
 * <ul>
 *   <li>ticket exchange — {@code POST /api/v1/auth/sso/ticket/exchange}</li>
 * </ul>
 *
 * @see "sso-login-ticket-flow.md §2.3 前端兑换 ticket"
 */
@Component
public class ShimmerBffClient {

    private static final Logger log = LoggerFactory.getLogger(ShimmerBffClient.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String baseUrl;
    private final RestClient restClient;

    public ShimmerBffClient(ShimmerOpenApiProperties properties) {
        this.baseUrl = properties.getOpenapi().getBaseUrl();
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    /**
     * 用一次性登录 ticket 兑换平台 token。
     *
     * <p>调用 {@code POST /api/v1/auth/sso/ticket/exchange}。</p>
     *
     * @param ticket Shimmer BFF 签发的一次性登录票据
     * @return { platform_access_token, platform_refresh_token, expires_in, user_id }
     * @throws RuntimeException ticket 无效、过期或已消费
     */
    public TokenResult exchangeTicket(String ticket) {
        ObjectNode body = MAPPER.createObjectNode();
        body.put("ticket", ticket);

        log.debug("BFF ticket exchange, ticket prefix: {}***", ticket.substring(0, Math.min(8, ticket.length())));

        String response = restClient.post()
                .uri("/api/v1/auth/sso/ticket/exchange")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body.toString())
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(),
                        (req, resp) -> {
                            byte[] bytes = resp.getBody().readAllBytes();
                            throw new RuntimeException("BFF ticket exchange HTTP " + resp.getStatusCode()
                                    + ": " + new String(bytes, StandardCharsets.UTF_8));
                        })
                .body(String.class);

        try {
            JsonNode root = MAPPER.readTree(response);
            int code = root.get("code").asInt();
            if (code != 0) {
                String message = root.has("message") ? root.get("message").asText() : "未知错误";
                throw new RuntimeException("BFF ticket exchange 业务错误 [" + code + "]: " + message);
            }
            JsonNode data = root.get("data");
            return new TokenResult(
                    data.get("platform_access_token").asText(),
                    data.get("platform_refresh_token").asText(),
                    data.get("expires_in").asLong(),
                    data.get("user_id").asText()
            );
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("BFF ticket exchange 响应解析失败: " + e.getMessage(), e);
        }
    }

    // ==================== DTO ====================

    public record TokenResult(
            String platformAccessToken,
            String platformRefreshToken,
            long expiresIn,
            String userId
    ) {}
}
