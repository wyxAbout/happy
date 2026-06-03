package com.qingquan.service.impl;

import com.qingquan.entity.CardType;
import com.qingquan.mapper.CardTypeMapper;
import com.qingquan.service.CardTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

/**
 * 卡牌类型业务实现。
 *
 * <p>对 Mapper 层进行封装，增加业务校验：
 * getById / update / delete 在操作不存在的记录时抛出
 * IllegalArgumentException，由 Controller 转为 HTTP 404。</p>
 */
@Service
@RequiredArgsConstructor
public class CardTypeServiceImpl implements CardTypeService {

    private final CardTypeMapper cardTypeMapper;

    /** @param isEnable null=查全部，1=仅启用的 */
    @Override
    public List<CardType> list(Integer isEnable) {
        return cardTypeMapper.selectAll(isEnable);
    }

    /** @throws IllegalArgumentException 卡牌类型不存在 → Controller → 404 */
    @Override
    public CardType getById(Integer id) {
        CardType cardType = cardTypeMapper.selectById(id);
        if (cardType == null) {
            throw new IllegalArgumentException("卡牌类型不存在: " + id);
        }
        return cardType;
    }

    @Override
    public void save(CardType cardType) {
        cardTypeMapper.insert(cardType);
    }

    /** @throws IllegalArgumentException 卡牌类型不存在 → Controller → 404 */
    @Override
    public void update(CardType cardType) {
        if (cardTypeMapper.selectById(cardType.getId()) == null) {
            throw new IllegalArgumentException("卡牌类型不存在: " + cardType.getId());
        }
        cardTypeMapper.update(cardType);
    }

    /** @throws IllegalArgumentException 卡牌类型不存在 → Controller → 404 */
    @Override
    public void delete(Integer id) {
        if (cardTypeMapper.selectById(id) == null) {
            throw new IllegalArgumentException("卡牌类型不存在: " + id);
        }
        cardTypeMapper.deleteById(id);
    }
}
