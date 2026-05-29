package com.qingquan.service;

import com.qingquan.entity.CardType;
import java.util.List;

public interface CardTypeService {
    List<CardType> list(Integer isEnable);
    CardType getById(Integer id);
    void save(CardType cardType);
    void update(CardType cardType);
    void delete(Integer id);
}
