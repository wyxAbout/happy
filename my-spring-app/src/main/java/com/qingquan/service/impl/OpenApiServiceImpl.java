package com.qingquan.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qingquan.dto.openapi.*;
import com.qingquan.http.ApiClient;
import com.qingquan.http.ApiException;
import com.qingquan.http.ApiResponse;
import com.qingquan.http.SimpleCacheManager;
import com.qingquan.service.OpenApiService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class OpenApiServiceImpl implements OpenApiService {

    private static final String LOGIN_PATH = "/auth/login";
    private static final String TOKEN_REFRESH_PATH = "/auth/token/refresh";
    private static final String LOGOUT_PATH = "/auth/logout";
    private static final String USER_BASIC_PATH = "/user/basic/get";
    private static final String POINT_ACCOUNT_PATH = "/point/account/get";
    private static final String POINT_TRANSACTION_PATH = "/point/transaction/list";
    private static final String POINT_GRANT_PATH = "/point/grant";

    private static final String HEADER_ACCESS_TOKEN = "X-Platform-Access-Token";
    private static final String HEADER_IDEMPOTENCY = "X-Idempotency-Key";

    private final ApiClient apiClient;
    private final ObjectMapper objectMapper;
    private final SimpleCacheManager cacheManager;

    public OpenApiServiceImpl(ApiClient apiClient, ObjectMapper objectMapper,
                               SimpleCacheManager cacheManager) {
        this.apiClient = apiClient;
        this.objectMapper = objectMapper;
        this.cacheManager = cacheManager;
    }

    @Override
    public SSOLoginResponse ssoLogin(String code, String state, String deviceId) {
        String body = writeJson(new LoginBody(code, state, deviceId));

        ApiResponse response = apiClient.post(LOGIN_PATH)
                .body(body)
                .execute();

        return parseData(response, SSOLoginResponse.class);
    }

    @Override
    public TokenRefreshResponse refreshToken(String refreshToken, String deviceId) {
        String body = writeJson(new RefreshBody(refreshToken, deviceId));

        ApiResponse response = apiClient.post(TOKEN_REFRESH_PATH)
                .body(body)
                .execute();

        return parseData(response, TokenRefreshResponse.class);
    }

    @Override
    public void logout(String accessToken, String refreshToken, String deviceId) {
        String body = writeJson(new LogoutBody(accessToken, refreshToken, deviceId));

        apiClient.post(LOGOUT_PATH)
                .body(body)
                .execute();
    }

    @Override
    public UserBasicResponse getUserBasic(String platformAccessToken) {
        ApiResponse response = apiClient.post(USER_BASIC_PATH)
                .header(HEADER_ACCESS_TOKEN, platformAccessToken)
                .body("{}")
                .execute();

        return parseData(response, UserBasicResponse.class);
    }

    @Override
    public PointAccountResponse getPointAccount(String platformAccessToken) {
        ApiResponse response = apiClient.post(POINT_ACCOUNT_PATH)
                .header(HEADER_ACCESS_TOKEN, platformAccessToken)
                .body("{}")
                .execute();

        return parseData(response, PointAccountResponse.class);
    }

    @Override
    public PointTransactionListResponse listPointTransactions(String platformAccessToken,
                                                               String transactionType, Integer pageNo, Integer pageSize) {
        var body = new PointTransactionRequest();
        body.setTransactionType(transactionType);
        body.setPageNo(pageNo);
        body.setPageSize(pageSize);

        ApiResponse response = apiClient.post(POINT_TRANSACTION_PATH)
                .header(HEADER_ACCESS_TOKEN, platformAccessToken)
                .body(writeJson(body))
                .execute();

        return parseData(response, PointTransactionListResponse.class);
    }

    @Override
    public PointGrantResponse grantPoints(String platformAccessToken, String idempotencyKey,
                                           String ruleCode, Long points, String bizType, String bizId, String remark) {
        if (idempotencyKey == null || idempotencyKey.length() < 8 || idempotencyKey.length() > 128) {
            throw new ApiException(400, "X-Idempotency-Key 必须为 8-128 字符");
        }
        if (points == null || points <= 0) {
            throw new ApiException(400, "points 必须 > 0");
        }
        if (!bizType.equals("external.reward") && !bizType.equals("external.adjustment")
                && !bizType.equals("campaign.reward")) {
            throw new ApiException(400, "biz_type 仅支持 external.reward / external.adjustment / campaign.reward");
        }

        var body = new PointGrantRequest();
        body.setRuleCode(ruleCode);
        body.setPoints(points);
        body.setBizType(bizType);
        body.setBizId(bizId);
        body.setRemark(remark);

        ApiResponse response = apiClient.post(POINT_GRANT_PATH)
                .header(HEADER_ACCESS_TOKEN, platformAccessToken)
                .header(HEADER_IDEMPOTENCY, idempotencyKey)
                .body(writeJson(body))
                .execute();

        return parseData(response, PointGrantResponse.class);
    }

    private <T> T parseData(ApiResponse response, Class<T> clazz) {
        if (!response.isSuccess()) {
            throw new ApiException(response.getStatusCode(), "接口返回 " + response.getStatusCode());
        }
        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            int code = root.has("code") ? root.get("code").asInt() : -1;
            if (code != 0 && code != 200) {
                String message = root.has("message") ? root.get("message").asText() : "未知错误";
                throw new ApiException(code, message);
            }
            JsonNode dataNode = root.has("data") ? root.get("data") : root;
            return objectMapper.convertValue(dataNode, clazz);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse OpenAPI response: {}", response.getBody(), e);
            throw new ApiException(500, "响应解析失败", e);
        }
    }

    private String writeJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new ApiException(500, "请求体序列化失败", e);
        }
    }

    private record LoginBody(String code, String state, String device_id) {}

    private record RefreshBody(String refresh_token, String device_id) {}

    private record LogoutBody(String access_token, String refresh_token, String device_id) {}
}
