package com.qingquan.controller;

import com.qingquan.common.Result;
import org.springframework.web.bind.annotation.*;


import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class WebController {
    @GetMapping({"/", ""})
    public Result<Map<String, Object>> index() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("app", "12happy");
        Map<String, String> apis = new LinkedHashMap<>();
        apis.put("login", "POST /api/auth/login");
        apis.put("card_types", "GET /api/card-types");
        apis.put("user_cards", "GET /api/user-cards");
        apis.put("openapi_proxy", "/api/openapi/**");
        apis.put("hello", "GET /hello");
        info.put("endpoints", apis);
        return Result.success(info);
    }

    @GetMapping("/hello")
    public Result<String> hello() {
        return Result.success("欢迎访问项目接口！");
    }

}
