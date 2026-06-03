package com.qingquan.entity;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserCard {
    private Long id;

    @NotNull(message = "userId 不能为空")
    @Min(value = 1, message = "userId 必须为正整数")
    private Long userId;

    @NotNull(message = "cardTypeId 不能为空")
    @Min(value = 1, message = "cardTypeId 范围 1–24")
    @Max(value = 24, message = "cardTypeId 范围 1–24")
    private Integer cardTypeId;

    @NotBlank(message = "source 不能为空")
    private String source;

    private LocalDateTime obtainedTime;
}
