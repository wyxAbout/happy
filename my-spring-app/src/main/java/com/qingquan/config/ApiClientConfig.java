package com.qingquan.config;

import com.qingquan.http.ApiClient;
import com.qingquan.http.AwsV4AuthInterceptor;
import com.qingquan.http.LoggingInterceptor;
import com.qingquan.http.SimpleCacheManager;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class ApiClientConfig {

    private final OpenApiProperties openApiProperties;

    @Bean
    public SimpleCacheManager apiCacheManager() {
        return new SimpleCacheManager(60_000);
    }

    @Bean
    public ApiClient openApiClient(SimpleCacheManager cacheManager) {
        return ApiClient.builder()
                .baseUrl(openApiProperties.getBaseUrl() + openApiProperties.getBasePath())
                .addRequestInterceptor(new AwsV4AuthInterceptor(
                        openApiProperties.getAuth().getAppId(),
                        openApiProperties.getAuth()::getApiKey,
                        openApiProperties.getServerName()
                ))
                .addRequestInterceptor(new LoggingInterceptor())
                .addResponseInterceptor(new LoggingInterceptor())
                .cacheManager(cacheManager)
                .maxRetries(2)
                .retryBaseDelayMs(500)
                .build();
    }
}
