package com.qingquan.service;

import com.qingquan.dto.ExchangeRequest;
import com.qingquan.entity.UserCard;
import java.util.List;

/**
 * 用户卡牌业务接口。
 *
 * <h3>核心功能</h3>
 * <ol>
 *   <li>CRUD：增删改查用户卡牌（带所有权校验）</li>
 *   <li>批量删除：deleteByUserId（图鉴重置用）</li>
 *   <li>图片兑换：exchange() — 4张换1张，事务原子操作</li>
 * </ol>
 *
 * <h3>安全</h3>
 * 所有涉及 userId 的操作必须通过所有权校验（validateOwnership），
 * 确保请求者（X-User-Id 头）只能操作自己的数据。
 */
public interface UserCardService {

    /** 查询指定用户的所有卡牌（userId=null 时查全部不校验） */
    List<UserCard> list(Long userId);

    /** 按主键查单条 */
    UserCard getById(Long id);

    /** 新增卡牌（游戏通关掉落/VictoryOverlay 调用） */
    void save(UserCard userCard);

    /** 更新卡牌 */
    void update(UserCard userCard);

    /** 按主键删除单条 */
    void delete(Long id);

    /**
     * 删除指定用户的所有卡牌记录（图鉴重置用）。
     * @param userId 用户 ID
     * @return 被删除的记录数
     * @throws IllegalArgumentException 越权操作（userId ≠ X-User-Id）
     */
    int deleteByUserId(Long userId);

    /**
     * 图片兑换：消耗 4 张相同卡牌，获得 1 张目标卡牌。
     *
     * <p>事务性原子操作 — 4 张删除 + 1 张新增在同一 @Transactional 中完成，
     * 任何一步失败自动回滚，不会产生"半兑换"状态。</p>
     *
     * <h3>兑换流程</h3>
     * <ol>
     *   <li>越权校验：userId 必须与 X-User-Id 一致</li>
     *   <li>数量校验：需要 ≥4 张 sourceCardTypeId</li>
     *   <li>SELECT ... LIMIT 4 — 取最早的 4 张来源卡牌</li>
     *   <li>DELETE ... WHERE id IN (4个id) — 批量删除</li>
     *   <li>INSERT — 新增 1 张目标卡牌（source="exchange"）</li>
     *   <li>return 新卡牌记录</li>
     * </ol>
     *
     * @param request 包含 userId、sourceCardTypeId、targetCardTypeId
     * @return 新创建的卡牌记录（含 id, userId, cardTypeId, source, obtainedTime）
     * @throws IllegalArgumentException 数量不足 4 张 或 无权操作其他用户数据
     */
    UserCard exchange(ExchangeRequest request);
}
