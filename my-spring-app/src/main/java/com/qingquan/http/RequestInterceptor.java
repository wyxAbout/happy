package com.qingquan.http;

public interface RequestInterceptor {
    void intercept(RequestContext context);
    int order();
}
