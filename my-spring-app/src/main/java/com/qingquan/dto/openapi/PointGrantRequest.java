package com.qingquan.dto.openapi;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PointGrantRequest {
    private String ruleCode;
    private Long points;
    private String bizType;
    private String bizId;
    private String remark;
}
