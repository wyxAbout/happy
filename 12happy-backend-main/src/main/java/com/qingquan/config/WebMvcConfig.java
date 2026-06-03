package com.qingquan.config;

import com.qingquan.interceptor.UserContextInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVC 配置 —— 注册安全拦截器。
 *
 * <h3>拦截路径</h3>
 * <ul>
 *   <li><b>/api/**</b> — UserContextInterceptor 提取用户身份</li>
 *   <li><b>/api/open/**</b> — 排除，OpenAPI 端点</li>
 *   <li><b>/api/auth/**</b> — 排除，SSO 登录 BFF 端点</li>
 * </ul>
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final UserContextInterceptor userContextInterceptor;

    public WebMvcConfig(UserContextInterceptor userContextInterceptor) {
        this.userContextInterceptor = userContextInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(userContextInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/open/**", "/api/auth/**");
    }
}
