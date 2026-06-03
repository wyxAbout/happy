package com.qingquan.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CardType {
    private Integer id;
    private String cardName;
    private String icon;
    private Integer typeIndex;
    private Integer isEnable;
    private LocalDateTime createTime;
}
