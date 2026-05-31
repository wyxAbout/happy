package com.qingquan.http;

import lombok.extern.slf4j.Slf4j;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;

@Slf4j
public class ApiClient {

    private final HttpClient httpClient;
    private final String baseUrl;
    private final List<RequestInterceptor> requestInterceptors;
    private final List<ResponseInterceptor> responseInterceptors;
    private final SimpleCacheManager cacheManager;
    private final int maxRetries;
    private final long retryBaseDelayMs;
    private final Duration defaultTimeout;

    private ApiClient(Builder builder) {
        HttpClient.Builder httpBuilder = HttpClient.newBuilder()
                .connectTimeout(builder.connectTimeout != null ? builder.connectTimeout : Duration.ofSeconds(10));

        this.httpClient = httpBuilder.build();
        this.baseUrl = builder.baseUrl;
        this.cacheManager = builder.cacheManager;
        this.maxRetries = builder.maxRetries;
        this.retryBaseDelayMs = builder.retryBaseDelayMs;
        this.defaultTimeout = builder.defaultTimeout != null ? builder.defaultTimeout : Duration.ofSeconds(30);

        List<RequestInterceptor> reqInterceptors = new ArrayList<>();
        if (builder.requestInterceptors != null) {
            reqInterceptors.addAll(builder.requestInterceptors);
        }
        reqInterceptors.sort(Comparator.comparingInt(RequestInterceptor::order));
        this.requestInterceptors = Collections.unmodifiableList(reqInterceptors);

        List<ResponseInterceptor> respInterceptors = new ArrayList<>();
        if (builder.responseInterceptors != null) {
            respInterceptors.addAll(builder.responseInterceptors);
        }
        respInterceptors.sort(Comparator.comparingInt(ResponseInterceptor::order));
        this.responseInterceptors = Collections.unmodifiableList(respInterceptors);
    }

    public static Builder builder() {
        return new Builder();
    }

    public RequestBuilder request(String method, String path) {
        return new RequestBuilder(method, path);
    }

    public RequestBuilder get(String path) {
        return request("GET", path);
    }

    public RequestBuilder post(String path) {
        return request("POST", path);
    }

    public RequestBuilder put(String path) {
        return request("PUT", path);
    }

    public RequestBuilder delete(String path) {
        return request("DELETE", path);
    }

    public RequestBuilder patch(String path) {
        return request("PATCH", path);
    }

    private ApiResponse executeInternal(RequestBuilder rb) {
        String fullUrl = baseUrl != null ? baseUrl + rb.path : rb.path;

        if (rb.queryParams != null && !rb.queryParams.isEmpty()) {
            StringBuilder qs = new StringBuilder();
            for (Map.Entry<String, String> e : rb.queryParams.entrySet()) {
                if (qs.length() > 0) qs.append("&");
                qs.append(urlEncode(e.getKey())).append("=").append(urlEncode(e.getValue()));
            }
            fullUrl += (rb.path.contains("?") ? "&" : "?") + qs;
        }

        URI uri = URI.create(fullUrl);
        byte[] body = rb.body != null ? rb.body : new byte[0];
        Map<String, String> headers = new LinkedHashMap<>();
        if (rb.headers != null) {
            headers.putAll(rb.headers);
        }
        if (rb.contentType != null) {
            headers.putIfAbsent("Content-Type", rb.contentType);
        }

        RequestContext ctx = new RequestContext(uri, rb.method, headers, body);

        for (RequestInterceptor interceptor : requestInterceptors) {
            interceptor.intercept(ctx);
        }

        if (rb.nonce != null) {
            ctx.setHeader("X-Amz-Nonce", rb.nonce);
        }

        try {
            HttpRequest.Builder httpReqBuilder = HttpRequest.newBuilder()
                    .uri(ctx.getUri())
                    .timeout(rb.timeout != null ? rb.timeout : defaultTimeout);

            for (Map.Entry<String, String> entry : ctx.getHeaders().entrySet()) {
                httpReqBuilder.header(entry.getKey(), entry.getValue());
            }

            httpReqBuilder.method(ctx.getMethod(), ctx.getBody().length > 0
                    ? HttpRequest.BodyPublishers.ofByteArray(ctx.getBody())
                    : HttpRequest.BodyPublishers.noBody());

            HttpResponse<String> httpResponse = withRetry(() ->
                    httpClient.send(httpReqBuilder.build(), HttpResponse.BodyHandlers.ofString()),
                    maxRetries, retryBaseDelayMs
            );

            Map<String, List<String>> respHeaders = new LinkedHashMap<>();
            httpResponse.headers().map().forEach((k, v) ->
                    respHeaders.put(k, new ArrayList<>(v))
            );

            ApiResponse apiResp = new ApiResponse(
                    httpResponse.statusCode(),
                    httpResponse.body(),
                    respHeaders
            );

            for (ResponseInterceptor interceptor : responseInterceptors) {
                apiResp = interceptor.intercept(apiResp);
            }

            if (!apiResp.isSuccess() && !rb.suppressError) {
                String msg = String.format("%s %s returned %d", ctx.getMethod(), ctx.getUri().getPath(), apiResp.getStatusCode());
                throw new ApiException(apiResp.getStatusCode(), msg, apiResp.getBody());
            }

            return apiResp;

        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Request failed: {} {}", rb.method, fullUrl, e);
            throw new ApiException(0, "请求失败: " + e.getMessage(), e);
        }
    }

    public CompletableFuture<ApiResponse> executeAsync(RequestBuilder rb) {
        return CompletableFuture.supplyAsync(() -> executeInternal(rb));
    }

    private <T> T withRetry(Callable<T> action, int maxRetries, long baseDelayMs) throws Exception {
        Exception lastException = null;
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return action.call();
            } catch (ApiException e) {
                if (!e.is5xx() || attempt >= maxRetries) throw e;
                lastException = e;
            } catch (Exception e) {
                lastException = e;
            }
            if (attempt < maxRetries) {
                long delay = baseDelayMs * (attempt + 1);
                log.warn("Retry {} after {}ms", attempt + 1, delay);
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw lastException;
                }
            }
        }
        throw lastException;
    }

    private String urlEncode(String value) {
        if (value == null) return "";
        StringBuilder sb = new StringBuilder();
        for (char c : value.toCharArray()) {
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
                    || c == '-' || c == '_' || c == '.' || c == '~') {
                sb.append(c);
            } else {
                sb.append(String.format("%%%02X", (int) c));
            }
        }
        return sb.toString();
    }

    public ApiResponse getCached(String cacheKey) {
        return cacheManager != null ? cacheManager.get(cacheKey) : null;
    }

    public void cachePut(String cacheKey, ApiResponse response, long ttlMs) {
        if (cacheManager != null) {
            cacheManager.put(cacheKey, response, ttlMs);
        }
    }

    public void cacheInvalidate(String cacheKey) {
        if (cacheManager != null) {
            cacheManager.invalidate(cacheKey);
        }
    }

    public class RequestBuilder {
        private final String method;
        private final String path;
        private Map<String, String> headers;
        private Map<String, String> queryParams;
        private byte[] body;
        private String contentType;
        private Duration timeout;
        private String nonce;
        private boolean suppressError;
        private String cacheKey;
        private long cacheTtlMs;
        private Consumer<ApiResponse> onSuccess;
        private Consumer<ApiException> onError;

        RequestBuilder(String method, String path) {
            this.method = method.toUpperCase();
            this.path = path;
            this.contentType = "application/json";
        }

        public RequestBuilder header(String name, String value) {
            if (headers == null) headers = new LinkedHashMap<>();
            headers.put(name, value);
            return this;
        }

        public RequestBuilder queryParam(String name, String value) {
            if (queryParams == null) queryParams = new LinkedHashMap<>();
            queryParams.put(name, value);
            return this;
        }

        public RequestBuilder body(String jsonBody) {
            this.body = jsonBody != null ? jsonBody.getBytes(java.nio.charset.StandardCharsets.UTF_8) : null;
            return this;
        }

        public RequestBuilder body(byte[] rawBody) {
            this.body = rawBody;
            return this;
        }

        public RequestBuilder contentType(String contentType) {
            this.contentType = contentType;
            return this;
        }

        public RequestBuilder timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }

        public RequestBuilder nonce(String nonce) {
            this.nonce = nonce;
            return this;
        }

        public RequestBuilder suppressError(boolean suppress) {
            this.suppressError = suppress;
            return this;
        }

        public RequestBuilder cache(String key, long ttlMs) {
            this.cacheKey = key;
            this.cacheTtlMs = ttlMs;
            return this;
        }

        public RequestBuilder onSuccess(Consumer<ApiResponse> callback) {
            this.onSuccess = callback;
            return this;
        }

        public RequestBuilder onError(Consumer<ApiException> callback) {
            this.onError = callback;
            return this;
        }

        public ApiResponse execute() {
            if (cacheKey != null && cacheManager != null) {
                ApiResponse cached = cacheManager.get(cacheKey);
                if (cached != null) {
                    if (onSuccess != null) onSuccess.accept(cached);
                    return cached;
                }
            }

            try {
                ApiResponse response = executeInternal(this);
                if (cacheKey != null && cacheManager != null && response.isSuccess()) {
                    cacheManager.put(cacheKey, response, cacheTtlMs);
                }
                if (onSuccess != null) onSuccess.accept(response);
                return response;
            } catch (ApiException e) {
                if (onError != null) onError.accept(e);
                throw e;
            }
        }

        public CompletableFuture<ApiResponse> executeAsync() {
            return ApiClient.this.executeAsync(this);
        }
    }

    public static class Builder {
        private String baseUrl;
        private List<RequestInterceptor> requestInterceptors;
        private List<ResponseInterceptor> responseInterceptors;
        private SimpleCacheManager cacheManager;
        private int maxRetries = 2;
        private long retryBaseDelayMs = 500;
        private Duration connectTimeout;
        private Duration defaultTimeout;

        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder addRequestInterceptor(RequestInterceptor interceptor) {
            if (requestInterceptors == null) requestInterceptors = new ArrayList<>();
            requestInterceptors.add(interceptor);
            return this;
        }

        public Builder addResponseInterceptor(ResponseInterceptor interceptor) {
            if (responseInterceptors == null) responseInterceptors = new ArrayList<>();
            responseInterceptors.add(interceptor);
            return this;
        }

        public Builder cacheManager(SimpleCacheManager cacheManager) {
            this.cacheManager = cacheManager;
            return this;
        }

        public Builder maxRetries(int maxRetries) {
            this.maxRetries = maxRetries;
            return this;
        }

        public Builder retryBaseDelayMs(long retryBaseDelayMs) {
            this.retryBaseDelayMs = retryBaseDelayMs;
            return this;
        }

        public Builder connectTimeout(Duration connectTimeout) {
            this.connectTimeout = connectTimeout;
            return this;
        }

        public Builder defaultTimeout(Duration defaultTimeout) {
            this.defaultTimeout = defaultTimeout;
            return this;
        }

        public ApiClient build() {
            return new ApiClient(this);
        }
    }
}
