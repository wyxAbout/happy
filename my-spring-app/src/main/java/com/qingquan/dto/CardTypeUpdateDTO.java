package com.qingquan.dto;

import lombok.Data;

@Data
public class CardTypeUpdateDTO {
    private Integer id;
    private String cardName;
    private String icon;
    private Integer typeIndex;
    private Integer isEnable;
}
