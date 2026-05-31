package com.qingquan.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "openapi")
public class OpenApiProperties {

    private String baseUrl = "https://go.neusoft.edu.cn";
    private String basePath = "/api/open/v1";
    private String loginPath = "/auth/login";
    private String serverName = "go.neusoft.edu.cn";
    private Auth auth = new Auth();

    @Data
    public static class Auth {
        private String appId = "";
        private String apiKey = "";
    }
}
