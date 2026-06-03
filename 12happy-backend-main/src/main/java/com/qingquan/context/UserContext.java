package com.qingquan.context;

/**
 * 当前请求的用户身份上下文（ThreadLocal 实现）。
 *
 * <p>由 {@code UserContextInterceptor} 在每次请求进入时从
 * HTTP 请求头 {@code X-User-Id} 中提取并设置；请求结束后清除。</p>
 *
 * <p>Service 层通过 {@code UserContext.getCurrentUserId()} 获取
 * 当前请求者身份，用于越权校验。</p>
 *
 * <h3>数据流</h3>
 * <pre>
 * 浏览器 ── X-User-Id:1 ──▶ Interceptor.setCurrentUserId(1)
 *                                      │
 *                              Service.validateOwnership()
 *                                      │
 *                              UserContext.getCurrentUserId() → 1
 *                                      │
 * 响应返回 ◀────────────────────────────┘
 * Interceptor.afterCompletion → UserContext.clear()
 * </pre>
 *
 * <h3>注意事项</h3>
 * <ul>
 *   <li>ThreadLocal 仅在 Tomcat 线程池模型下正确工作</li>
 *   <li>若请求头缺失 X-User-Id，currentUserId 为 null，ownership 校验自动放行（向后兼容）</li>
 * </ul>
 */
public class UserContext {

    private static final ThreadLocal<Long> CURRENT_USER = new ThreadLocal<>();

    /** 设置当前请求的用户 ID（由拦截器调用） */
    public static void setCurrentUserId(Long userId) {
        CURRENT_USER.set(userId);
    }

    /** 获取当前请求的用户 ID；无认证头时返回 null */
    public static Long getCurrentUserId() {
        return CURRENT_USER.get();
    }

    /** 清除当前线程绑定的用户 ID（请求结束时调用） */
    public static void clear() {
        CURRENT_USER.remove();
    }
}
