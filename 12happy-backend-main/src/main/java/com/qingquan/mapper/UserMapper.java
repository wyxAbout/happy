package com.qingquan.mapper;

import com.qingquan.entity.User;
import org.apache.ibatis.annotations.Mapper;

/**
 * 本地用户 MyBatis Mapper。
 */
@Mapper
public interface UserMapper {

    /** 按本地 ID 查询 */
    User selectById(Long id);

    /** 按 Shimmer 用户 ID 查询 */
    User selectByShimmerUserId(String shimmerUserId);

    /** 插入用户记录，主键回填到 id */
    int insert(User user);

    /** 按主键更新 */
    int update(User user);
}
