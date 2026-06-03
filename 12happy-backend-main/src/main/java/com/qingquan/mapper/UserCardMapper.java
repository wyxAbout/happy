package com.qingquan.mapper;

import com.qingquan.entity.UserCard;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface UserCardMapper {

    /** 查询指定用户的所有卡牌（userId=null 时查全部），按获得时间倒序 */
    List<UserCard> selectAll(Long userId);

    /** 按主键查单条 */
    UserCard selectById(Long id);

    /** 插入一条卡牌记录，主键回填到 id 字段 */
    int insert(UserCard userCard);

    /** 按主键更新卡牌 */
    int update(UserCard userCard);

    /** 按主键删除单条 */
    int deleteById(Long id);

    /**
     * 删除指定用户的所有卡牌记录（图鉴重置用）。
     * @param userId 用户 ID
     * @return 被删除的记录数
     */
    int deleteByUserId(@Param("userId") Long userId);

    /**
     * 按用户 ID + 卡牌类型 ID 查询前 N 条记录（兑换时取 4 张来源卡牌用）。
     * 按获得时间倒序，确保消耗最早获得的卡牌。
     *
     * @param userId     用户 ID
     * @param cardTypeId 卡牌类型 ID
     * @param limit      最大返回条数（兑换时固定为 4）
     * @return 最早获得的 limit 张该类型卡牌
     */
    List<UserCard> selectByUserIdAndCardTypeId(
            @Param("userId") Long userId,
            @Param("cardTypeId") Integer cardTypeId,
            @Param("limit") int limit);

    /**
     * 批量按主键删除（兑换时一次性删除 4 张来源卡牌用）。
     * 通过 MyBatis FOREACH 拼接 DELETE ... WHERE id IN (...)
     *
     * @param ids 要删除的主键列表
     * @return 被删除的记录数
     */
    int deleteByIds(@Param("ids") java.util.List<Long> ids);
}
