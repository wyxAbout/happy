package com.qingquan.controller;

import com.qingquan.common.Result;
import com.qingquan.entity.CardType;
import com.qingquan.service.CardTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 卡牌类型管理 Controller。
 *
 * <h3>端点列表</h3>
 * <table>
 *   <tr><td>GET    /api/card-types</td><td>获取卡牌类型列表（isEnable 可选过滤）</td></tr>
 *   <tr><td>GET    /api/card-types/{id}</td><td>获取单个卡牌类型</td></tr>
 *   <tr><td>POST   /api/card-types</td><td>新增卡牌类型</td></tr>
 *   <tr><td>PUT    /api/card-types</td><td>更新卡牌类型</td></tr>
 *   <tr><td>DELETE /api/card-types/{id}</td><td>删除卡牌类型</td></tr>
 * </table>
 *
 * <h3>异常处理</h3>
 * Service 层抛出的 IllegalArgumentException 由 GlobalExceptionHandler 统一转换。
 */
@RestController
@RequestMapping("/api/card-types")
@RequiredArgsConstructor
public class CardTypeController {

    private final CardTypeService cardTypeService;

    @GetMapping
    public Result<List<CardType>> list(@RequestParam(required = false) Integer isEnable) {
        return Result.success(cardTypeService.list(isEnable));
    }

    @GetMapping("/{id}")
    public Result<CardType> getById(@PathVariable Integer id) {
        return Result.success(cardTypeService.getById(id));
    }

    @PostMapping
    public Result<Void> add(@RequestBody CardType cardType) {
        cardTypeService.save(cardType);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@RequestBody CardType cardType) {
        cardTypeService.update(cardType);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Integer id) {
        cardTypeService.delete(id);
        return Result.success();
    }
}
