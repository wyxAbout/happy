package com.qingquan.dto;

import lombok.Data;

@Data
public class UserCardUpdateDTO {
    private Long id;
    private Integer cardTypeId;
    private String source;
}
