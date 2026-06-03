package com.qingquan.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 图片兑换请求体 DTO。
 *
 * <p>前端 POST /api/user-cards/exchange 时传入此 JSON 对象。</p>
 *
 * <h3>字段说明</h3>
 * <ul>
 *   <li><b>userId</b> — 发起兑换的用户 ID，必须与 X-User-Id 头一致</li>
 *   <li><b>sourceCardTypeId</b> — 要消耗的卡牌类型 ID（需持有 ≥4 张）</li>
 *   <li><b>targetCardTypeId</b> — 要获得的卡牌类型 ID（可为未解锁类型）</li>
 * </ul>
 */
@Data
public class ExchangeRequest {
    @NotNull(message = "userId 不能为空")
    @Min(value = 1, message = "userId 必须为正整数")
    private Long userId;

    @NotNull(message = "sourceCardTypeId 不能为空")
    @Min(value = 1, message = "sourceCardTypeId 范围 1–24")
    @Max(value = 24, message = "sourceCardTypeId 范围 1–24")
    private Integer sourceCardTypeId;

    @NotNull(message = "targetCardTypeId 不能为空")
    @Min(value = 1, message = "targetCardTypeId 范围 1–24")
    @Max(value = 24, message = "targetCardTypeId 范围 1–24")
    private Integer targetCardTypeId;
}
