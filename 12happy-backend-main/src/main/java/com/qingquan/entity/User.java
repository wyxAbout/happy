package com.qingquan.entity;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 本地用户实体 —— 映射 Shimmer SSO 用户到本地数据库。
 *
 * <p>SSO 登录成功后，前端调用 /register 完成本地账号创建。
 * 后续所有游戏数据的 userId 与此表 id 关联。</p>
 */
@Data
public class User {
    /** 本地自增 ID（游戏数据用此 ID 关联） */
    private Long id;

    /** Shimmer 平台的用户唯一标识（如 usr_xxx） */
    private String shimmerUserId;

    /** 用户昵称 / 显示名 */
    private String username;

    /** 头像 URL */
    private String avatar;

    /** 账号创建时间 */
    private LocalDateTime createdAt;
}
