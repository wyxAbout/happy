package com.qingquan.controller;

import com.qingquan.common.Result;
import com.qingquan.dto.LoginRequest;
import com.qingquan.dto.LoginResponse;
import com.qingquan.service.OpenApiLoginService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class OpenApiLoginController {

    private final OpenApiLoginService loginService;

    @PostMapping("/login")
    public Result<LoginResponse> login(@RequestBody LoginRequest request) {
        boolean hasCode = request.getCode() != null && !request.getCode().isBlank();
        boolean hasState = request.getState() != null && !request.getState().isBlank();

        if (!hasCode || !hasState) {
            try {
                LoginResponse response = loginService.getLoginUrl();
                return Result.success("请跳转至登录页面完成身份认证", response);
            } catch (OpenApiLoginService.OpenApiException e) {
                log.warn("Get login URL failed [code={}]: {}", e.getCode(), e.getMessage());
                return Result.error(e.getCode(), e.getMessage());
            } catch (Exception e) {
                log.error("Unexpected get login URL error", e);
                return Result.error("系统内部错误，请稍后重试");
            }
        }

        try {
            LoginResponse response = loginService.login(request);
            return Result.success("登录成功", response);
        } catch (OpenApiLoginService.OpenApiException e) {
            log.warn("Login failed [code={}]: {}", e.getCode(), e.getMessage());
            return Result.error(e.getCode(), e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected login error", e);
            return Result.error("系统内部错误，请稍后重试");
        }
    }
}
