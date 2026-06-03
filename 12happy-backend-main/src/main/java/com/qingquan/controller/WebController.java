package com.qingquan.controller;

import com.qingquan.common.Result;
import org.springframework.web.bind.annotation.*;


@RestController
public class WebController {
    /**
     * 1. 最简单的成功返回
     */
    @GetMapping("/hello")
    public Result hello() {
        return Result.success("欢迎访问项目接口！");
    }

}
