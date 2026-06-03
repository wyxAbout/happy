package com.qingquan.interceptor;

import com.qingquan.context.UserContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 用户身份提取拦截器。
 *
 * <p>在每个请求进入 Controller 前，从 HTTP 请求头 {@code X-User-Id}
 * 提取当前用户 ID，写入 {@link UserContext}（ThreadLocal）。
 * 请求处理结束后自动清除。</p>
 *
 * <h3>设计意图</h3>
 * 为后续可能的 JWT/OAuth 认证预留扩展点。当前默认 userId=1，
 * 前端通过 cardService.js 自动携带 {@code X-User-Id: 1}。
 *
 * <h3>注册路径</h3>
 * 在 WebMvcConfig 中注册到 {@code /api/**}，排除 {@code /api/open/**}
 * （为 openapi-integration.md 描述的 OpenAPI 端点预留）。
 */
public class UserContextInterceptor implements HandlerInterceptor {

    /**
     * 前置处理：提取 X-User-Id 头。
     * @return true 表示继续执行；若 X-User-Id 格式错误则返回 false (HTTP 400)
     */
    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        String userIdHeader = request.getHeader("X-User-Id");
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            try {
                UserContext.setCurrentUserId(Long.parseLong(userIdHeader.trim()));
            } catch (NumberFormatException e) {
                response.setStatus(400);
                return false;
            }
        }
        return true;
    }

    /** 请求完成后清理 ThreadLocal，防止内存泄漏 */
    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) {
        UserContext.clear();
    }
}
