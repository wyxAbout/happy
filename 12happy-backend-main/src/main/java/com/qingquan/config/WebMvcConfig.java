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
 *   <li><b>/api/**</b> — UserContextInterceptor 提取 X-User-Id</li>
 *   <li><b>/api/open/**</b> — 排除，为未来 OpenAPI 端点预留</li>
 * </ul>
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new UserContextInterceptor())
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/open/**");
    }
}
