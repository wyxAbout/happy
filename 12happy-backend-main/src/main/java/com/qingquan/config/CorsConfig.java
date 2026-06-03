package com.qingquan.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * CORS 跨域安全配置。
 *
 * <p>限制可跨域访问的来源域名，防止任意网站通过 fetch/XHR 调用 API。</p>
 *
 * <h3>来源配置</h3>
 * 通过 {@code app.cors.allowed-origins} 配置，逗号分隔。默认仅 localhost 开发域名。
 *
 * <h3>安全要点</h3>
 * <ul>
 *   <li>allowedHeaders 使用明确白名单，禁止通配符 *（与 credentials 不兼容）</li>
 *   <li>allowCredentials=true 使前端可携带 X-Api-Key / X-User-Id</li>
 *   <li>未暴露敏感响应头</li>
 * </ul>
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081,http://[::1]:5173,http://[::1]:4173,http://[::1]:8080,http://[::1]:8081}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(
                Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList()
        );
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(
                "Accept",
                "Accept-Language",
                "Content-Type",
                "X-User-Id",
                "X-Api-Key",
                "Authorization"
        ));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
