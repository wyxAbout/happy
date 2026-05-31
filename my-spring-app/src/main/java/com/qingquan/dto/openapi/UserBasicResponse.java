package com.qingquan.dto.openapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserBasicResponse {
    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("nickname")
    private String nickname;

    @JsonProperty("avatar")
    private String avatar;

    @JsonProperty("phone")
    private String phone;

    @JsonProperty("email")
    private String email;
}
