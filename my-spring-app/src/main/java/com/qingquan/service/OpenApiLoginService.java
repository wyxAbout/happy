package com.qingquan.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qingquan.config.OpenApiProperties;
import com.qingquan.dto.LoginRequest;
import com.qingquan.dto.LoginResponse;
import com.qingquan.http.ApiClient;
import com.qingquan.http.ApiException;
import com.qingquan.http.ApiResponse;
import com.qingquan.session.SessionManager;
import com.qingquan.util.AwsV4Signer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Callable;

@Slf4j
@Service
public class OpenApiLoginService {

    private static final int MAX_RETRIES = 2;
    private static final long RETRY_BASE_DELAY_MS = 500;

    private final OpenApiProperties properties;
    private final ObjectMapper objectMapper;
    private final SessionManager sessionManager;
    private final ApiClient apiClient;
    private final HttpClient httpClient;

    public OpenApiLoginService(OpenApiProperties properties, ObjectMapper objectMapper,
                                SessionManager sessionManager, ApiClient apiClient) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.sessionManager = sessionManager;
        this.apiClient = apiClient;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public LoginResponse getLoginUrl() {
        validateConfig();

        try {
            ApiResponse response = apiClient.post(properties.getLoginPath())
                    .body("{}")
                    .execute();

            log.info("OpenAPI getLoginUrl response: status={}", response.getStatusCode());

            return parseLoginUrlResponse(response);

        } catch (ApiException e) {
            throw new OpenApiException(e.getStatusCode(), e.getMessage());
        } catch (OpenApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("OpenAPI getLoginUrl request failed", e);
            throw new OpenApiException(500, "获取登录地址失败，请稍后重试");
        }
    }

    public LoginResponse login(LoginRequest request) {
        validateConfig();

        try {
            String jsonBody = objectMapper.writeValueAsString(request);

            ApiResponse response = apiClient.post(properties.getLoginPath())
                    .body(jsonBody)
                    .execute();

            log.info("OpenAPI login response: status={}", response.getStatusCode());

            return parseLoginResponse(response);

        } catch (ApiException e) {
            throw new OpenApiException(e.getStatusCode(), e.getMessage());
        } catch (OpenApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("OpenAPI login request failed", e);
            throw new OpenApiException(500, "登录请求失败，请稍后重试");
        }
    }

    public String proxyRequest(String platformAccessToken, String method, String path, String query,
                                byte[] requestBody, String contentType) {
        validateConfig();

        try {
            String fullPath = properties.getBasePath() + path;
            if (query != null && !query.isEmpty()) {
                fullPath += "?" + query;
            }
            URI uri = URI.create(properties.getBaseUrl() + fullPath);

            String nonce = UUID.randomUUID().toString();
            byte[] body = requestBody != null ? requestBody : new byte[0];

            AwsV4Signer.SignedRequest signed = AwsV4Signer.sign(
                    properties.getAuth().getAppId(),
                    platformAccessToken,
                    uri,
                    method,
                    nonce,
                    properties.getServerName(),
                    body
            );

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", contentType != null ? contentType : "application/json");

            for (var entry : signed.getHeaders().entrySet()) {
                reqBuilder.header(entry.getKey(), entry.getValue());
            }

            reqBuilder.method(method, body.length > 0
                    ? HttpRequest.BodyPublishers.ofByteArray(body)
                    : HttpRequest.BodyPublishers.noBody());

            log.info("OpenAPI proxy: {} {}, nonce={}", method, path, nonce);

            HttpResponse<String> response = withRetry(() -> httpClient.send(
                    reqBuilder.build(),
                    HttpResponse.BodyHandlers.ofString()
            ));

            log.info("OpenAPI proxy response: status={}", response.statusCode());

            if (response.statusCode() >= 400) {
                log.warn("OpenAPI proxy error: status={}, body={}",
                        response.statusCode(),
                        response.body().length() > 500 ? response.body().substring(0, 500) : response.body());
                throw new OpenApiException(response.statusCode(), "接口请求失败");
            }

            return response.body();

        } catch (OpenApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("OpenAPI proxy request failed", e);
            throw new OpenApiException(500, "接口请求失败，请稍后重试");
        }
    }

    private <T> T withRetry(java.util.concurrent.Callable<T> action) throws Exception {
        Exception lastException = null;
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                return action.call();
            } catch (Exception e) {
                lastException = e;
                if (attempt < MAX_RETRIES) {
                    long delay = RETRY_BASE_DELAY_MS * (attempt + 1);
                    log.warn("Request attempt {} failed, retrying in {}ms: {}", attempt + 1, delay, e.getMessage());
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw e;
                    }
                }
            }
        }
        throw lastException;
    }

    private LoginResponse parseLoginUrlResponse(ApiResponse apiResponse) {
        int statusCode = apiResponse.getStatusCode();
        String body = apiResponse.getBody();

        if (statusCode == 200 || statusCode == 201) {
            try {
                JsonNode root = objectMapper.readTree(body);

                int code = root.has("code") ? root.get("code").asInt() : 0;
                if (code != 0 && code != 200) {
                    String message = root.has("message") ? root.get("message").asText() : "未知错误";
                    throw new OpenApiException(code, message);
                }

                JsonNode data = root.has("data") ? root.get("data") : root;

                String loginUrl = data.has("login_url") ? data.get("login_url").asText()
                        : data.has("redirect_url") ? data.get("redirect_url").asText()
                        : data.has("url") ? data.get("url").asText()
                        : null;

                if (loginUrl == null) {
                    throw new OpenApiException(500, "登录地址获取失败：响应中未包含登录URL");
                }

                LoginResponse result = new LoginResponse();
                result.setLoginUrl(loginUrl);
                return result;

            } catch (OpenApiException e) {
                throw e;
            } catch (Exception e) {
                log.error("Failed to parse login URL response: {}", body, e);
                throw new OpenApiException(500, "登录地址解析失败");
            }
        }

        throw new OpenApiException(statusCode, "获取登录地址失败，状态码: " + statusCode);
    }

    private void validateConfig() {
        if (properties.getAuth().getAppId() == null || properties.getAuth().getAppId().isBlank()) {
            throw new OpenApiException(400, "OpenAPI appId 未配置");
        }
        if (properties.getAuth().getApiKey() == null || properties.getAuth().getApiKey().isBlank()) {
            throw new OpenApiException(400, "OpenAPI apiKey 未配置");
        }
        if (properties.getServerName() == null || properties.getServerName().isBlank()) {
            throw new OpenApiException(400, "OpenAPI serverName 未配置");
        }
    }

    private LoginResponse parseLoginResponse(ApiResponse apiResponse) {
        int statusCode = apiResponse.getStatusCode();
        String body = apiResponse.getBody();

        if (statusCode == 200 || statusCode == 201) {
            try {
                JsonNode root = objectMapper.readTree(body);

                int code = root.has("code") ? root.get("code").asInt() : 0;
                if (code != 0 && code != 200) {
                    String message = root.has("message") ? root.get("message").asText() : "未知错误";
                    throw new OpenApiException(code, message);
                }

                JsonNode data = root.has("data") ? root.get("data") : root;

                String loginUrl = data.has("login_url") ? data.get("login_url").asText() : null;
                if (loginUrl != null) {
                    LoginResponse result = new LoginResponse();
                    result.setLoginUrl(loginUrl);
                    return result;
                }

                LoginResponse result = new LoginResponse();

                String platformAccessToken = data.has("platform_access_token") ? data.get("platform_access_token").asText() : null;
                String platformRefreshToken = data.has("platform_refresh_token") ? data.get("platform_refresh_token").asText() : null;
                long expiresIn = data.has("expires_in") ? data.get("expires_in").asLong() : 0;
                String userId = data.has("user_id") ? data.get("user_id").asText() : null;

                if (platformAccessToken == null || userId == null) {
                    throw new OpenApiException(500, "登录响应缺少必要字段");
                }

                String sessionToken = sessionManager.createSession(
                        userId, platformAccessToken, platformRefreshToken, expiresIn
                );

                result.setSessionToken(sessionToken);
                result.setExpiresIn(expiresIn);
                result.setUserId(userId);

                return result;
            } catch (OpenApiException e) {
                throw e;
            } catch (Exception e) {
                log.error("Failed to parse login response: {}", body, e);
                throw new OpenApiException(500, "登录响应解析失败");
            }
        }

        if (statusCode == 401 || statusCode == 403) {
            String remoteMsg = "OpenAPI 认证失败";
            try {
                JsonNode errorNode = objectMapper.readTree(body);
                if (errorNode.has("message")) {
                    remoteMsg = errorNode.get("message").asText();
                }
            } catch (Exception ignored) {}
            throw new OpenApiException(statusCode, remoteMsg + "，请检查 appId/apiKey 及 IP/服务器白名单");
        }
        if (statusCode == 400) {
            try {
                JsonNode errorNode = objectMapper.readTree(body);
                String msg = errorNode.has("message") ? errorNode.get("message").asText() : "请求参数错误";
                throw new OpenApiException(400, msg);
            } catch (OpenApiException e) {
                throw e;
            } catch (Exception e) {
                throw new OpenApiException(400, "请求参数错误");
            }
        }

        throw new OpenApiException(statusCode, "接口返回异常状态码: " + statusCode);
    }

    public static class OpenApiException extends RuntimeException {
        private final int code;

        public OpenApiException(int code, String message) {
            super(message);
            this.code = code;
        }

        public int getCode() {
            return code;
        }
    }
}

