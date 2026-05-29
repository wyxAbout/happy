package com.qingquan.mapper;

import com.qingquan.entity.CardType;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface CardTypeMapper {
    List<CardType> selectAll(Integer isEnable);
    CardType selectById(Integer id);
    int insert(CardType cardType);
    int update(CardType cardType);
    int deleteById(Integer id);
}
