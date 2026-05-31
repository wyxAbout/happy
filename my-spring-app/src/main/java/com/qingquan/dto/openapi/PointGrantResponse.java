package com.qingquan.dto.openapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PointGrantResponse {
    @JsonProperty("transaction_id")
    private String transactionId;

    @JsonProperty("points")
    private Long points;

    @JsonProperty("balance")
    private Long balance;
}
