package com.qingquan.dto.openapi;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TokenRefreshRequest {
    private String refreshToken;
    private String deviceId;
}
