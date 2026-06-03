package com.qingquan.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * API Key 认证过滤器。
 *
 * <p>要求所有 /api/** 请求携带有效的 {@code X-Api-Key} 请求头，
 * 与配置中的 {@code app.api-key} 进行恒定时间比较，防止时序攻击。</p>
 *
 * <h3>排除路径</h3>
 * <ul>
 *   <li>/api/images/** — 静态图片资源，无需认证</li>
 *   <li>/api/open/**    — 预留 OpenAPI 端点</li>
 *   <li>/hello           — 健康检查</li>
 * </ul>
 *
 * <h3>认证流程</h3>
 * <pre>
 * 浏览器 ── X-Api-Key: xxx ──▶ ApiKeyFilter.constantTimeEquals(xxx, configKey)
 *                                   │
 *                           一致 → chain.doFilter() → 正常处理
 *                           不一致 → 401 Unauthorized → {"code":401,"msg":"..."}
 * </pre>
 */
@Component
@Order(2)
public class ApiKeyFilter implements Filter {

    private final String expectedKey;

    public ApiKeyFilter(@Value("${app.api-key:}") String apiKey) {
        this.expectedKey = apiKey;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        if (shouldSkipAuth(httpRequest)) {
            chain.doFilter(request, response);
            return;
        }

        if (expectedKey == null || expectedKey.isBlank()) {
            chain.doFilter(request, response);
            return;
        }

        String providedKey = httpRequest.getHeader("X-Api-Key");
        if (providedKey == null || !constantTimeEquals(providedKey, expectedKey)) {
            httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            httpResponse.setContentType("application/json;charset=UTF-8");
            httpResponse.getWriter().write("{\"code\":401,\"msg\":\"未授权：X-Api-Key 无效或缺失\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private boolean shouldSkipAuth(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/images/")
                || path.startsWith("/api/open/")
                || "/hello".equals(path);
    }

    private boolean constantTimeEquals(String a, String b) {
        try {
            byte[] digestA = MessageDigest.getInstance("SHA-256")
                    .digest(a.getBytes(StandardCharsets.UTF_8));
            byte[] digestB = MessageDigest.getInstance("SHA-256")
                    .digest(b.getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(digestA, digestB);
        } catch (Exception e) {
            return false;
        }
    }
}
