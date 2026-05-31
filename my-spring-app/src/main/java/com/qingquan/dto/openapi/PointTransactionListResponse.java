package com.qingquan.dto.openapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PointTransactionListResponse {
    @JsonProperty("total")
    private Integer total;

    @JsonProperty("page_no")
    private Integer pageNo;

    @JsonProperty("page_size")
    private Integer pageSize;

    @JsonProperty("list")
    private List<PointTransactionItem> list;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PointTransactionItem {
        @JsonProperty("transaction_id")
        private String transactionId;

        @JsonProperty("transaction_type")
        private String transactionType;

        @JsonProperty("points")
        private Long points;

        @JsonProperty("balance")
        private Long balance;

        @JsonProperty("biz_type")
        private String bizType;

        @JsonProperty("biz_id")
        private String bizId;

        @JsonProperty("remark")
        private String remark;

        @JsonProperty("created_at")
        private String createdAt;
    }
}
