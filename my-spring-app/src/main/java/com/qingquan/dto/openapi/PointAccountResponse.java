package com.qingquan.dto.openapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PointAccountResponse {
    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("points")
    private Long points;

    @JsonProperty("frozen_points")
    private Long frozenPoints;

    @JsonProperty("total_earned")
    private Long totalEarned;
}
