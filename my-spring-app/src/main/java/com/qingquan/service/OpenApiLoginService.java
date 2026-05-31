package com.qingquan.service;

import com.qingquan.dto.LoginRequest;
import com.qingquan.dto.LoginResponse;
import com.qingquan.dto.openapi.SSOLoginResponse;
import com.qingquan.http.ApiException;
import com.qingquan.session.SessionManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class OpenApiLoginService {

    private final OpenApiService openApiService;
    private final SessionManager sessionManager;

    public OpenApiLoginService(OpenApiService openApiService, SessionManager sessionManager) {
        this.openApiService = openApiService;
        this.sessionManager = sessionManager;
    }

    public LoginResponse login(LoginRequest request) {
        try {
            SSOLoginResponse sso = openApiService.ssoLogin(
                    request.getCode(),
                    request.getState(),
                    request.getDeviceId()
            );

            String sessionToken = sessionManager.createSession(
                    sso.getUserId(),
                    sso.getPlatformAccessToken(),
                    sso.getPlatformRefreshToken(),
                    sso.getExpiresIn()
            );

            LoginResponse result = new LoginResponse();
            result.setSessionToken(sessionToken);
            result.setExpiresIn(sso.getExpiresIn());
            result.setUserId(sso.getUserId());

            return result;

        } catch (ApiException e) {
            throw new OpenApiException(e.getStatusCode(), e.getMessage());
        } catch (OpenApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Login failed", e);
            throw new OpenApiException(500, "登录请求失败，请稍后重试");
        }
    }

    public static class OpenApiException extends RuntimeException {
        private final int code;

        public OpenApiException(int code, String message) {
            super(message);
            this.code = code;
        }

        public int getCode() {
            return code;
        }
    }
}
