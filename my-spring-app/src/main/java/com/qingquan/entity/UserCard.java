package com.qingquan.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserCard {
    private Long id;
    private Long userId;
    private Integer cardTypeId;
    private String source;
    private LocalDateTime obtainedTime;
}
