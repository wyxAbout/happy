package com.qingquan.dto;

import lombok.Data;

/**
 * 注册请求体。
 */
@Data
public class RegisterRequest {
    /** 用户昵称（可选，不传则自动生成） */
    private String username;

    /** 头像 URL（可选） */
    private String avatar;
}
