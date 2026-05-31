package com.qingquan.dto.openapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class TokenRefreshResponse {
    @JsonProperty("platform_access_token")
    private String platformAccessToken;

    @JsonProperty("platform_refresh_token")
    private String platformRefreshToken;

    @JsonProperty("expires_in")
    private Long expiresIn;
}
