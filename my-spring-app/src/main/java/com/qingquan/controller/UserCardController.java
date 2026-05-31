package com.qingquan.controller;

import com.qingquan.common.Result;
import com.qingquan.dto.UserCardCreateDTO;
import com.qingquan.dto.UserCardUpdateDTO;
import com.qingquan.entity.UserCard;
import com.qingquan.service.UserCardService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user-cards")
@RequiredArgsConstructor
public class UserCardController {

    private final UserCardService userCardService;

    @GetMapping
    public Result<List<UserCard>> list(HttpServletRequest request) {
        Long userId = Long.valueOf(request.getAttribute("userId").toString());
        return Result.success(userCardService.list(userId));
    }

    @GetMapping("/user/{userId}")
    public Result<List<UserCard>> listByUserId(@PathVariable Long userId, HttpServletRequest request) {
        Long currentUserId = Long.valueOf(request.getAttribute("userId").toString());
        if (!currentUserId.equals(userId)) {
            return Result.error(403, "无权查看其他用户的数据");
        }
        return Result.success(userCardService.list(currentUserId));
    }

    @GetMapping("/{id}")
    public Result<UserCard> getById(@PathVariable Long id, HttpServletRequest request) {
        Long currentUserId = Long.valueOf(request.getAttribute("userId").toString());
        UserCard card = userCardService.getById(id);
        if (card == null) {
            return Result.error(404, "卡牌不存在");
        }
        if (!currentUserId.equals(card.getUserId())) {
            return Result.error(403, "无权查看其他用户的卡牌");
        }
        return Result.success(card);
    }

    @PostMapping
    public Result<Void> add(@RequestBody UserCardCreateDTO dto, HttpServletRequest request) {
        Long currentUserId = Long.valueOf(request.getAttribute("userId").toString());
        UserCard userCard = new UserCard();
        userCard.setUserId(currentUserId);
        userCard.setCardTypeId(dto.getCardTypeId());
        userCard.setSource(dto.getSource());
        userCardService.save(userCard);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@RequestBody UserCardUpdateDTO dto, HttpServletRequest request) {
        Long currentUserId = Long.valueOf(request.getAttribute("userId").toString());
        UserCard existing = userCardService.getById(dto.getId());
        if (existing == null) {
            return Result.error(404, "卡牌不存在");
        }
        if (!currentUserId.equals(existing.getUserId())) {
            return Result.error(403, "无权修改其他用户的卡牌");
        }
        UserCard userCard = new UserCard();
        userCard.setId(dto.getId());
        userCard.setUserId(existing.getUserId());
        userCard.setCardTypeId(dto.getCardTypeId());
        userCard.setSource(dto.getSource());
        userCardService.update(userCard);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        Long currentUserId = Long.valueOf(request.getAttribute("userId").toString());
        UserCard existing = userCardService.getById(id);
        if (existing == null) {
            return Result.error(404, "卡牌不存在");
        }
        if (!currentUserId.equals(existing.getUserId())) {
            return Result.error(403, "无权删除其他用户的卡牌");
        }
        userCardService.delete(id);
        return Result.success();
    }
}
