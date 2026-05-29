package com.qingquan.service.impl;

import com.qingquan.entity.CardType;
import com.qingquan.mapper.CardTypeMapper;
import com.qingquan.service.CardTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CardTypeServiceImpl implements CardTypeService {

    private final CardTypeMapper cardTypeMapper;

    @Override
    public List<CardType> list(Integer isEnable) {
        return cardTypeMapper.selectAll(isEnable);
    }

    @Override
    public CardType getById(Integer id) {
        return cardTypeMapper.selectById(id);
    }

    @Override
    public void save(CardType cardType) {
        cardTypeMapper.insert(cardType);
    }

    @Override
    public void update(CardType cardType) {
        cardTypeMapper.update(cardType);
    }

    @Override
    public void delete(Integer id) {
        cardTypeMapper.deleteById(id);
    }
}
