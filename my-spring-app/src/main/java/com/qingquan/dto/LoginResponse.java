package com.qingquan.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LoginResponse {
    @JsonProperty("login_url")
    private String loginUrl;

    @JsonProperty("session_token")
    private String sessionToken;

    @JsonProperty("expires_in")
    private Long expiresIn;

    @JsonProperty("user_id")
    private String userId;
}
