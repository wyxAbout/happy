package com.qingquan.mapper;

import com.qingquan.entity.UserCard;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface UserCardMapper {
    List<UserCard> selectAll(Long userId);
    UserCard selectById(Long id);
    int insert(UserCard userCard);
    int update(UserCard userCard);
    int deleteById(Long id);
}
