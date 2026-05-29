package com.qingquan.service;

import com.qingquan.entity.UserCard;
import java.util.List;

public interface UserCardService {
    List<UserCard> list(Long userId);
    UserCard getById(Long id);
    void save(UserCard userCard);
    void update(UserCard userCard);
    void delete(Long id);
}
