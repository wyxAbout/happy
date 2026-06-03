package com.qingquan.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 安全响应头过滤器 —— 为所有 HTTP 响应添加防御性头部。
 *
 * <p>此过滤器优先级最高（@Order(1)），在所有请求返回前统一设安全头。</p>
 *
 * <h3>添加的头部</h3>
 * <table>
 *   <tr><td>X-Frame-Options: DENY</td><td>防止页面被嵌入 iframe，防御点击劫持</td></tr>
 *   <tr><td>X-Content-Type-Options: nosniff</td><td>禁止浏览器 MIME 类型嗅探</td></tr>
 *   <tr><td>X-XSS-Protection: 1; mode=block</td><td>启用浏览器 XSS 过滤器</td></tr>
 *   <tr><td>Referrer-Policy: strict-origin-when-cross-origin</td><td>跨域时限制 Referer</td></tr>
 *   <tr><td>Permissions-Policy</td><td>禁用不必要 API（摄像头/麦克风/位置）</td></tr>
 * </table>
 */
@Component
@Order(1)
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        httpResponse.setHeader("X-Frame-Options", "DENY");
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpResponse.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        chain.doFilter(request, response);
    }
}
