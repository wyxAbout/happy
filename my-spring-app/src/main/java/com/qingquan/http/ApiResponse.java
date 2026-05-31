package com.qingquan.http;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ApiResponse {

    private final int statusCode;
    private final String body;
    private final Map<String, List<String>> headers;

    public ApiResponse(int statusCode, String body, Map<String, List<String>> headers) {
        this.statusCode = statusCode;
        this.body = body;
        this.headers = headers != null
                ? Collections.unmodifiableMap(new LinkedHashMap<>(headers))
                : Collections.emptyMap();
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getBody() {
        return body;
    }

    public Map<String, List<String>> getHeaders() {
        return headers;
    }

    public String getFirstHeader(String name) {
        List<String> values = headers.get(name);
        return values != null && !values.isEmpty() ? values.get(0) : null;
    }

    public boolean isSuccess() {
        return statusCode >= 200 && statusCode < 300;
    }

    public boolean isClientError() {
        return statusCode >= 400 && statusCode < 500;
    }

    public boolean isServerError() {
        return statusCode >= 500;
    }

    @Override
    public String toString() {
        return "ApiResponse{status=" + statusCode + ", bodyLen="
                + (body != null ? body.length() : 0) + "}";
    }
}
