package com.qingquan.http;

public class ApiException extends RuntimeException {

    private final int statusCode;
    private final String responseBody;

    public ApiException(int statusCode, String message) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = null;
    }

    public ApiException(int statusCode, String message, String responseBody) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public ApiException(int statusCode, String message, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.responseBody = null;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public boolean is4xx() {
        return statusCode >= 400 && statusCode < 500;
    }

    public boolean is5xx() {
        return statusCode >= 500;
    }
}
