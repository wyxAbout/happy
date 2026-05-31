package com.qingquan.controller;

import com.qingquan.common.Result;
import com.qingquan.dto.CardTypeCreateDTO;
import com.qingquan.dto.CardTypeUpdateDTO;
import com.qingquan.entity.CardType;
import com.qingquan.service.CardTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public Result<Void> add(@RequestBody CardTypeCreateDTO dto) {
        CardType cardType = new CardType();
        cardType.setCardName(dto.getCardName());
        cardType.setIcon(dto.getIcon());
        cardType.setTypeIndex(dto.getTypeIndex());
        cardType.setIsEnable(dto.getIsEnable() != null ? dto.getIsEnable() : 1);
        cardTypeService.save(cardType);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@RequestBody CardTypeUpdateDTO dto) {
        CardType cardType = new CardType();
        cardType.setId(dto.getId());
        cardType.setCardName(dto.getCardName());
        cardType.setIcon(dto.getIcon());
        cardType.setTypeIndex(dto.getTypeIndex());
        cardType.setIsEnable(dto.getIsEnable());
        cardTypeService.update(cardType);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Integer id) {
        cardTypeService.delete(id);
        return Result.success();
    }
}
