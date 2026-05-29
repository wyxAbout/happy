package com.qingquan.service.impl;

import com.qingquan.entity.UserCard;
import com.qingquan.mapper.UserCardMapper;
import com.qingquan.service.UserCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserCardServiceImpl implements UserCardService {

    private final UserCardMapper userCardMapper;

    @Override
    public List<UserCard> list(Long userId) {
        return userCardMapper.selectAll(userId);
    }

    @Override
    public UserCard getById(Long id) {
        return userCardMapper.selectById(id);
    }

    @Override
    public void save(UserCard userCard) {
        userCardMapper.insert(userCard);
    }

    @Override
    public void update(UserCard userCard) {
        userCardMapper.update(userCard);
    }

    @Override
    public void delete(Long id) {
        userCardMapper.deleteById(id);
    }
}
