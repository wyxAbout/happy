package com.qingquan.service;

import com.qingquan.dto.openapi.*;

public interface OpenApiService {

    SSOLoginResponse ssoLogin(String code, String state, String deviceId);

    TokenRefreshResponse refreshToken(String refreshToken, String deviceId);

    void logout(String platformAccessToken, String refreshToken, String deviceId);

    UserBasicResponse getUserBasic(String platformAccessToken);

    PointAccountResponse getPointAccount(String platformAccessToken);

    PointTransactionListResponse listPointTransactions(String platformAccessToken,
                                                        String transactionType, Integer pageNo, Integer pageSize);

    PointGrantResponse grantPoints(String platformAccessToken, String idempotencyKey,
                                    String ruleCode, Long points, String bizType, String bizId, String remark);
}
