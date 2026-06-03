package com.qingquan.shimmer.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.qingquan.shimmer.config.ShimmerOpenApiProperties;
import com.qingquan.shimmer.signer.OpenApiSigner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;

/**
 * Shimmer OpenAPI 签名客户端 —— 服务端对服务端。
 *
 * <p>所有请求自动附加 AWSv4 签名和必需 Headers：
 * {@code Authorization}, {@code X-Amz-Date}, {@code X-Amz-Nonce},
 * {@code X-OpenAPI-Server-Name}。</p>
 *
 * <h3>使用场景</h3>
 * 本客户端用于后端直接调用 Shimmer OpenAPI 接口（需要 API Key + 签名）。
 * 浏览器登录流程应使用 {@link ShimmerBffClient} 调用 Shimmer BFF 端点。
 *
 * <h3>当前支持接口</h3>
 * <ul>
 *   <li>{@link #getAuthorizeUrl()} — 获取 SSO 授权 URL</li>
 *   <li>{@link #exchangeCodeForToken(String, String)} — code 换取 token</li>
 *   <li>{@link #getUserBasic(String)} — 获取当前用户基础信息</li>
 * </ul>
 */
@Component
public class ShimmerOpenApiClient {

    private static final Logger log = LoggerFactory.getLogger(ShimmerOpenApiClient.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ShimmerOpenApiProperties.OpenApi props;
    private final RestClient restClient;

    public ShimmerOpenApiClient(ShimmerOpenApiProperties properties) {
        this.props = properties.getOpenapi();
        this.restClient = RestClient.builder()
                .baseUrl(props.getBaseUrl())
                .build();
    }

    // ==================== Auth 接口 ====================

    /**
     * 获取 SSO 授权登录 URL（无 code/state 语义）。
     *
     * @return { authorize_url, state, expires_in }
     */
    public AuthorizeUrlResult getAuthorizeUrl() {
        JsonNode data = signedPost("/api/open/v1/auth/login", "{}");
        return new AuthorizeUrlResult(
                data.get("authorize_url").asText(),
                data.get("state").asText(),
                data.get("expires_in").asLong()
        );
    }

    /**
     * 用 SSO 回调的 code + state 换取平台 token。
     *
     * @return { platform_access_token, platform_refresh_token, expires_in, user_id }
     */
    public TokenResult exchangeCodeForToken(String code, String state) {
        ObjectNode body = MAPPER.createObjectNode();
        body.put("code", code);
        body.put("state", state);
        String bodyStr = body.toString();

        JsonNode data = signedPost("/api/open/v1/auth/login", bodyStr);
        return new TokenResult(
                data.get("platform_access_token").asText(),
                data.get("platform_refresh_token").asText(),
                data.get("expires_in").asLong(),
                data.get("user_id").asText()
        );
    }

    // ==================== 用户接口 ====================

    /**
     * 获取当前登录用户的基础信息。
     *
     * <p>调用 {@code POST /api/open/v1/user/basic/get}，
     * 需要通过 {@code X-Platform-Access-Token} 指明当前用户。</p>
     *
     * @param platformAccessToken 用户的平台 access token
     * @return 用户信息 JSON 树（包含 user_id, nickname, avatar, mobile, email 等字段）
     */
    public JsonNode getUserBasic(String platformAccessToken) {
        return signedPostWithToken("/api/open/v1/user/basic/get", "{}", platformAccessToken);
    }

    // ==================== 内部方法 ====================

    /**
     * 带 X-Platform-Access-Token 的签名 POST（用于用户态接口）。
     */
    JsonNode signedPostWithToken(String path, String body, String platformAccessToken) {
        OpenApiSigner.SignatureResult sig = OpenApiSigner.sign(
                props.getAppId(),
                props.getApiKey(),
                props.getServerName(),
                "POST",
                path,
                "",
                body
        );

        log.debug("OpenAPI POST {} (with token) nonce={}", path, sig.nonce());

        String response = restClient.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", sig.authorization())
                .header("X-Amz-Date", sig.amzDate())
                .header("X-Amz-Nonce", sig.nonce())
                .header("X-OpenAPI-Server-Name", props.getServerName())
                .header("X-Platform-Access-Token", platformAccessToken)
                .body(body)
                .retrieve()
                .onStatus(status -> status.value() != HttpStatus.OK.value(),
                        (req, resp) -> {
                            byte[] bytes = resp.getBody().readAllBytes();
                            throw new RuntimeException("OpenAPI HTTP " + resp.getStatusCode()
                                    + ": " + new String(bytes, StandardCharsets.UTF_8));
                        })
                .body(String.class);

        try {
            JsonNode root = MAPPER.readTree(response);
            int code = root.get("code").asInt();
            if (code != 0) {
                String message = root.has("message") ? root.get("message").asText() : "未知错误";
                throw new RuntimeException("OpenAPI 业务错误 [" + code + "]: " + message);
            }
            return root.get("data");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("OpenAPI 响应解析失败: " + e.getMessage(), e);
        }
    }

    /**
     * 发送带签名的 POST 请求，解析 JSON 响应并返回 data 节点。
     *
     * <p>响应格式：{@code {"code":0,"message":"...","request_id":"...","data":{...}}}
     * code=0 视为成功，否则抛出异常。</p>
     */
    JsonNode signedPost(String path, String body) {
        OpenApiSigner.SignatureResult sig = OpenApiSigner.sign(
                props.getAppId(),
                props.getApiKey(),
                props.getServerName(),
                "POST",
                path,
                "",
                body
        );

        log.debug("OpenAPI POST {} nonce={}", path, sig.nonce());

        String response = restClient.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", sig.authorization())
                .header("X-Amz-Date", sig.amzDate())
                .header("X-Amz-Nonce", sig.nonce())
                .header("X-OpenAPI-Server-Name", props.getServerName())
                .body(body)
                .retrieve()
                .onStatus(status -> status.value() != HttpStatus.OK.value(),
                        (req, resp) -> {
                            byte[] bytes = resp.getBody().readAllBytes();
                            throw new RuntimeException("OpenAPI HTTP " + resp.getStatusCode()
                                    + ": " + new String(bytes, StandardCharsets.UTF_8));
                        })
                .body(String.class);

        try {
            JsonNode root = MAPPER.readTree(response);
            int code = root.get("code").asInt();
            if (code != 0) {
                String message = root.has("message") ? root.get("message").asText() : "未知错误";
                throw new RuntimeException("OpenAPI 业务错误 [" + code + "]: " + message);
            }
            return root.get("data");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("OpenAPI 响应解析失败: " + e.getMessage(), e);
        }
    }

    // ==================== DTO 类型 ====================

    public record AuthorizeUrlResult(
            String authorizeUrl,
            String state,
            long expiresIn
    ) {}

    public record TokenResult(
            String platformAccessToken,
            String platformRefreshToken,
            long expiresIn,
            String userId
    ) {}
}
