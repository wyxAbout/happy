package com.qingquan.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qingquan.common.Result;
import com.qingquan.session.SessionManager;
import com.qingquan.session.UserSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final SessionManager sessionManager;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String authHeader = request.getHeader(AUTH_HEADER);

        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            writeError(response, 401, "未登录，请先获取授权");
            return false;
        }

        String sessionToken = authHeader.substring(BEARER_PREFIX.length()).trim();
        if (sessionToken.isEmpty()) {
            writeError(response, 401, "未登录，请先获取授权");
            return false;
        }

        UserSession session = sessionManager.getSession(sessionToken);
        if (session == null) {
            writeError(response, 401, "登录已过期，请重新登录");
            return false;
        }

        request.setAttribute("userId", session.getUserId());
        request.setAttribute("platformAccessToken", session.getPlatformAccessToken());
        return true;
    }

    private void writeError(HttpServletResponse response, int code, String message) throws Exception {
        response.setStatus(200);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        Result<Void> result = Result.error(code, message);
        response.getWriter().write(objectMapper.writeValueAsString(result));
    }
}
