package com.qingquan.http;

public interface ResponseInterceptor {
    ApiResponse intercept(ApiResponse response);
    int order();
}
