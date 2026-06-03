package com.qingquan.interceptor;

import com.qingquan.context.UserContext;
import com.qingquan.shimmer.store.SessionStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 用户身份提取拦截器。
 *
 * <p>从请求头中提取当前用户身份，按优先级：</p>
 * <ol>
 *   <li>{@code X-Session-Token} — Shimmer SSO 登录后的会话 token（优先）</li>
 *   <li>{@code X-User-Id} — 直接声明的用户 ID（向后兼容）</li>
 * </ol>
 *
 * <p>提取到的 user_id 写入 {@link UserContext}（ThreadLocal），
 * 供 Service 层的所有权校验使用。请求处理结束后自动清除。</p>
 *
 * <h3>注册路径</h3>
 * 在 {@code WebMvcConfig} 中注册到 {@code /api/**}，排除
 * {@code /api/open/**} 和 {@code /api/auth/**}。
 */
@Component
public class UserContextInterceptor implements HandlerInterceptor {

    private final SessionStore sessionStore;

    public UserContextInterceptor(SessionStore sessionStore) {
        this.sessionStore = sessionStore;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {

        // 优先解析 X-Session-Token（Shimmer 登录用户）
        String sessionToken = request.getHeader("X-Session-Token");
        if (sessionToken != null && !sessionToken.isBlank()) {
            String userId = sessionStore.resolveUserId(sessionToken);
            if (userId != null) {
                try {
                    UserContext.setCurrentUserId(Long.parseLong(userId));
                } catch (NumberFormatException e) {
                    // userId 不是数字格式，暂存为 null
                }
                return true;
            }
            // session token 无效——但不阻塞请求，
            // Service 层会因 currentUserId=null 而拒绝需鉴权的操作
        }

        // 降级：X-User-Id（向后兼容）
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

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) {
        UserContext.clear();
    }
}
