package com.qingquan.controller;

import com.qingquan.common.Result;
import com.qingquan.entity.UserCard;
import com.qingquan.service.UserCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user-cards")
@RequiredArgsConstructor
public class UserCardController {

    private final UserCardService userCardService;

    @GetMapping
    public Result<List<UserCard>> list(@RequestParam(required = false) Long userId) {
        return Result.success(userCardService.list(userId));
    }

    @GetMapping("/{id}")
    public Result<UserCard> getById(@PathVariable Long id) {
        return Result.success(userCardService.getById(id));
    }

    @PostMapping
    public Result<Void> add(@RequestBody UserCard userCard) {
        userCardService.save(userCard);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@RequestBody UserCard userCard) {
        userCardService.update(userCard);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userCardService.delete(id);
        return Result.success();
    }
}
