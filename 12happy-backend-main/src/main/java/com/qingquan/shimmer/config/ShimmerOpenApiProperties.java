package com.qingquan.shimmer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Shimmer Shop OpenAPI 对接配置属性。
 *
 * <h3>配置前缀</h3>
 * {@code shimmer.openapi} — OpenAPI 签名调用相关
 * {@code shimmer.app}      — 本 BFF 应用自身配置
 *
 * <h3>环境变量映射</h3>
 * <pre>
 * OPENAPI_BASE_URL     → shimmer.openapi.base-url
 * OPENAPI_APP_ID       → shimmer.openapi.app-id
 * OPENAPI_API_KEY      → shimmer.openapi.api-key
 * OPENAPI_SERVER_NAME  → shimmer.openapi.server-name
 * OPENAPI_TIMEOUT_MS   → shimmer.openapi.timeout-ms
 * APP_BASE_URL         → shimmer.app.base-url
 * APP_REDIRECT_WHITELIST → shimmer.app.redirect-whitelist
 * </pre>
 */
@ConfigurationProperties(prefix = "shimmer")
public class ShimmerOpenApiProperties {

    /** OpenAPI 签名调用配置 */
    private final OpenApi openapi = new OpenApi();

    /** 本 BFF 应用自身配置 */
    private final App app = new App();

    public OpenApi getOpenapi() {
        return openapi;
    }

    public App getApp() {
        return app;
    }

    /**
     * Shimmer OpenAPI 签名调用配置。
     */
    public static class OpenApi {
        /** Shimmer 服务地址，如 {@code https://go.neusoft.edu.cn} */
        private String baseUrl = "https://go.neusoft.edu.cn";

        /** OpenAPI 应用 ID */
        private String appId;

        /** OpenAPI API Key（明文，仅用于本地签名计算，不传输） */
        private String apiKey;

        /** 调用服务器名，须命中 Shimmer 侧白名单 */
        private String serverName;

        /** HTTP 请求超时（毫秒），默认 3000 */
        private int timeoutMs = 3000;

        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

        public String getAppId() { return appId; }
        public void setAppId(String appId) { this.appId = appId; }

        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }

        public String getServerName() { return serverName; }
        public void setServerName(String serverName) { this.serverName = serverName; }

        public int getTimeoutMs() { return timeoutMs; }
        public void setTimeoutMs(int timeoutMs) { this.timeoutMs = timeoutMs; }
    }

    /**
     * 本 BFF 应用自身配置。
     */
    public static class App {
        /** 本后端对外可访问地址，用于构造 SSO callback URL */
        private String baseUrl = "http://localhost:5022";

        /** 允许的前端回跳地址白名单，逗号分隔（防开放重定向） */
        private String redirectWhitelist = "http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080";

        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

        public String getRedirectWhitelist() { return redirectWhitelist; }
        public void setRedirectWhitelist(String redirectWhitelist) { this.redirectWhitelist = redirectWhitelist; }
    }
}
