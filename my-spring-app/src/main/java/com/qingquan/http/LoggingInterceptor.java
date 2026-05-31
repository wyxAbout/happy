package com.qingquan.http;

import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.atomic.AtomicLong;

@Slf4j
public class LoggingInterceptor implements RequestInterceptor, ResponseInterceptor {

    private final AtomicLong requestId = new AtomicLong(0);
    private final ThreadLocal<String> currentId = new ThreadLocal<>();

    @Override
    public void intercept(RequestContext context) {
        String rid = String.valueOf(requestId.incrementAndGet());
        context.setHeader("X-Request-Id", rid);
        currentId.set(rid);
    }

    @Override
    public ApiResponse intercept(ApiResponse response) {
        try {
            String rid = currentId.get();
            log.info("HTTP [{}] {} status={}", rid,
                    response.getFirstHeader("X-Request-Method"),
                    response.getStatusCode());
            return response;
        } finally {
            currentId.remove();
        }
    }

    @Override
    public int order() {
        return Integer.MAX_VALUE;
    }
}
