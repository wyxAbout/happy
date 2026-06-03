package com.qingquan.controller;

import com.qingquan.common.Result;
import com.qingquan.dto.ExchangeRequest;
import com.qingquan.entity.UserCard;
import com.qingquan.service.UserCardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 用户卡牌管理 Controller。
 *
 * <h3>端点列表</h3>
 * <table>
 *   <tr><td>GET    /api/user-cards</td><td>查询卡牌（可带 userId 参数）</td></tr>
 *   <tr><td>GET    /api/user-cards/user/{userId}</td><td>按路径查指定用户卡牌</td></tr>
 *   <tr><td>GET    /api/user-cards/{id}</td><td>按主键查单张卡牌</td></tr>
 *   <tr><td>POST   /api/user-cards</td><td>新增卡牌（游戏掉落用）</td></tr>
 *   <tr><td>PUT    /api/user-cards</td><td>更新卡牌</td></tr>
 *   <tr><td>DELETE /api/user-cards/{id}</td><td>删除单张卡牌</td></tr>
 *   <tr><td>DELETE /api/user-cards/user/{userId}/all</td><td>图鉴重置：删除用户所有卡牌</td></tr>
 *   <tr><td>POST   /api/user-cards/exchange</td><td>图片兑换：4张 → 1张</td></tr>
 * </table>
 *
 * <h3>异常处理</h3>
 * Service 层抛出的 IllegalArgumentException 由 GlobalExceptionHandler 统一转换为 HTTP 状态码。
 *
 * <h3>认证</h3>
 * 通过 X-Api-Key 验证请求合法性，X-User-Id 标识用户身份。
 */
@RestController
@RequestMapping("/api/user-cards")
@RequiredArgsConstructor
public class UserCardController {

    private final UserCardService userCardService;

    @GetMapping
    public Result<List<UserCard>> list(@RequestParam(required = false) Long userId) {
        return Result.success(userCardService.list(userId));
    }

    @GetMapping("/user/{userId}")
    public Result<List<UserCard>> listByUserId(@PathVariable Long userId) {
        return Result.success(userCardService.list(userId));
    }

    @GetMapping("/{id}")
    public Result<UserCard> getById(@PathVariable Long id) {
        return Result.success(userCardService.getById(id));
    }

    @PostMapping
    public Result<Void> add(@Valid @RequestBody UserCard userCard) {
        userCardService.save(userCard);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@Valid @RequestBody UserCard userCard) {
        userCardService.update(userCard);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userCardService.delete(id);
        return Result.success();
    }

    @DeleteMapping("/user/{userId}/all")
    public Result<Integer> resetUserCards(@PathVariable Long userId) {
        int deleted = userCardService.deleteByUserId(userId);
        return Result.success(deleted);
    }

    @PostMapping("/exchange")
    public Result<UserCard> exchange(@Valid @RequestBody ExchangeRequest request) {
        UserCard result = userCardService.exchange(request);
        return Result.success(result);
    }
}
