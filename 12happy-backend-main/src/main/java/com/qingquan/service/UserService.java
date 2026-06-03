package com.qingquan.service;

import com.qingquan.entity.User;

/**
 * 本地用户业务接口。
 *
 * <h3>注册</h3>
 * SSO 登录成功后调用 register，按 shimmer_user_id 幂等创建本地账号。
 *
 * <h3>登录</h3>
 * 按 shimmer_user_id 查找本地用户，未注册时返回 null。
 */
public interface UserService {

    /**
     * 注册本地用户（幂等）。
     * 若 shimmerUserId 已存在，直接返回已有记录；否则插入新记录。
     */
    User register(String shimmerUserId, String username, String avatar);

    /** 按 Shimmer 用户 ID 查找本地用户 */
    User findByShimmerUserId(String shimmerUserId);

    /** 按本地 ID 查找用户 */
    User findById(Long id);
}
