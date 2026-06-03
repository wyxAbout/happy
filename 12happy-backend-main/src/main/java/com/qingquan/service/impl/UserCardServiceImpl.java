package com.qingquan.service.impl;

import com.qingquan.context.UserContext;
import com.qingquan.dto.ExchangeRequest;
import com.qingquan.entity.UserCard;
import com.qingquan.mapper.UserCardMapper;
import com.qingquan.service.UserCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 用户卡牌业务实现。
 *
 * <h3>核心功能</h3>
 * <ol>
 *   <li>CRUD：增删改查用户卡牌（带所有权校验）</li>
 *   <li>批量删除：deleteByUserId（图鉴重置用）</li>
 *   <li>图片兑换：exchange() — {@code @Transactional} 原子操作</li>
 * </ol>
 *
 * <h3>所有权校验（越权防护）</h3>
 * 每个涉及 userId 的方法都先调用 validateOwnership(userId)：
 * <ul>
 *   <li>若请求中未携带 X-User-Id 头 → currentUserId=null → 放行（向后兼容单机开发）</li>
 *   <li>若 userId ≠ currentUserId → 抛出 IllegalArgumentException → Controller 返回 403</li>
 * </ul>
 *
 * <h3>兑换事务详解</h3>
 * <pre>
 * exchange(request) {
 *   1. validateOwnership(userId)        ← 越权校验
 *   2. SELECT ... LIMIT 4               ← 取 4 张来源卡牌
 *   3. if < 4 → throw 400
 *   4. DELETE WHERE id IN (4id)         ← 批量删除
 *   5. INSERT (source="exchange")        ← 新增目标
 *   6. return 新卡牌记录
 * }
 * 全程在 @Transactional 内，任何一步失败自动回滚。
 * </pre>
 */
@Service
@RequiredArgsConstructor
public class UserCardServiceImpl implements UserCardService {

    private final UserCardMapper userCardMapper;

    @Override
    public List<UserCard> list(Long userId) {
        if (userId != null) {
            validateOwnership(userId);
        }
        return userCardMapper.selectAll(userId);
    }

    @Override
    public UserCard getById(Long id) {
        UserCard card = userCardMapper.selectById(id);
        if (card == null) {
            throw new IllegalArgumentException("卡牌记录不存在: " + id);
        }
        validateOwnership(card.getUserId());
        return card;
    }

    @Override
    public void save(UserCard userCard) {
        validateOwnership(userCard.getUserId());
        userCardMapper.insert(userCard);
    }

    @Override
    public void update(UserCard userCard) {
        if (userCardMapper.selectById(userCard.getId()) == null) {
            throw new IllegalArgumentException("卡牌记录不存在: " + userCard.getId());
        }
        validateOwnership(userCard.getUserId());
        userCardMapper.update(userCard);
    }

    @Override
    public void delete(Long id) {
        UserCard card = userCardMapper.selectById(id);
        if (card == null) {
            throw new IllegalArgumentException("卡牌记录不存在: " + id);
        }
        validateOwnership(card.getUserId());
        userCardMapper.deleteById(id);
    }

    @Override
    public int deleteByUserId(Long userId) {
        validateOwnership(userId);
        return userCardMapper.deleteByUserId(userId);
    }

    @Override
    @Transactional
    public UserCard exchange(ExchangeRequest request) {
        validateOwnership(request.getUserId());

        List<UserCard> sourceCards = userCardMapper.selectByUserIdAndCardTypeId(
                request.getUserId(), request.getSourceCardTypeId(), 4);

        if (sourceCards == null || sourceCards.size() < 4) {
            throw new IllegalArgumentException(
                    "卡片数量不足：需要4张，当前" + (sourceCards == null ? 0 : sourceCards.size()) + "张");
        }

        List<Long> deleteIds = sourceCards.stream()
                .map(UserCard::getId)
                .collect(Collectors.toList());
        userCardMapper.deleteByIds(deleteIds);

        UserCard newCard = new UserCard();
        newCard.setUserId(request.getUserId());
        newCard.setCardTypeId(request.getTargetCardTypeId());
        newCard.setSource("exchange");
        userCardMapper.insert(newCard);

        return newCard;
    }

    /**
     * 所有权校验 —— 确保请求者只能操作自己的数据。
     *
     * <p>从 ThreadLocal UserContext 中读取当前请求的 X-User-Id。
     * 若 currentUserId 为 null（未携带请求头），向后兼容放行。</p>
     *
     * @param userId 要操作的目标用户 ID
     * @throws IllegalArgumentException 无权操作其他用户的数据
     */
    private void validateOwnership(Long userId) {
        Long currentUserId = UserContext.getCurrentUserId();
        if (currentUserId != null && !currentUserId.equals(userId)) {
            throw new IllegalArgumentException("无权操作其他用户的数据");
        }
    }
}
