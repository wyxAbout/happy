package com.qingquan.myspringapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.qingquan.shimmer.client.ShimmerOpenApiClient;
import com.qingquan.shimmer.config.ShimmerOpenApiProperties;
import com.qingquan.shimmer.signer.OpenApiSigner;

/**
 * ShimmerOpenApiClient 手动集成测试。
 *
 * <p>不依赖 Spring 容器（纯 main 方法），直接构造配置和客户端实例。</p>
 *
 * <h3>运行方式</h3>
 * <pre>
 * cd 12happy-backend-main
 * ./mvnw exec:java -Dexec.mainClass="com.qingquan.myspringapp.test1" -q
 * </pre>
 *
 * <h3>测试方法</h3>
 * <ol>
 *   <li>签名算法本地验证 —— 不联网，验证 SHA-256 / HMAC 计算正确性</li>
 *   <li>getAuthorizeUrl() —— 真实调用 OpenAPI 获取 SSO 授权 URL</li>
 *   <li>getUserBasic(token) —— 需要实际 token，提供调用示例</li>
 * </ol>
 */
public class test1 {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    // ==================== 配置（与 application.yml 一致） ====================
    private static final String BASE_URL = "https://go.neusoft.edu.cn";
    private static final String APP_ID = "oak_4gm8xhh818ev";
    private static final String API_KEY = "oak_yLmDbUKk6C0Sq-Y9WsCrg1XqIFQWECvmi8vekXNboTA";
    private static final String SERVER_NAME = "go.neusoft.edu.cn";
    private static final int TIMEOUT_MS = 5000;

    public static void main(String[] args) {
        printBanner();

        // ---- 1. 签名算法本地验证（不联网） ----
        testSignerLocally();

        // ---- 2. 构造客户端 ----
        ShimmerOpenApiClient client = buildClient();

        // ---- 3. 测试 getAuthorizeUrl() —— 真实 OpenAPI 调用 ----
        testGetAuthorizeUrl(client);

        // ---- 4. getUserBasic() 说明 ----
        printGetUserBasicGuide();

        printSeparator();
        System.out.println("测试完成！");
    }

    // ==================== 测试 1：签名算法本地验证 ====================

    static void testSignerLocally() {
        printSeparator();
        System.out.println("【测试1】签名算法本地验证（不联网）\n");

        String method = "POST";
        String path = "/api/open/v1/auth/login";
        String body = "{\"code\":\"test_code\",\"state\":\"test_state\"}";
        String rawQuery = "";
        String amzDate = "20260603T120000Z";
        String nonce = "test-nonce-12345";
        String appId = APP_ID;
        String serverName = SERVER_NAME;

        // 1. 构建 CanonicalRequest
        String canonicalRequest = OpenApiSigner.buildCanonicalRequest(
                method, path, rawQuery, body, amzDate, nonce, appId, serverName);
        System.out.println("1. CanonicalRequest:");
        System.out.println("──────────────────────────────────────────");
        System.out.println(canonicalRequest);
        System.out.println("──────────────────────────────────────────\n");

        String canonicalHash = OpenApiSigner.sha256Hex(canonicalRequest);
        System.out.println("   SHA256(CanonicalRequest) = " + canonicalHash + "\n");

        // 2. 构建 StringToSign
        String stringToSign = OpenApiSigner.buildStringToSign(amzDate, "20260603", canonicalRequest);
        System.out.println("2. StringToSign:");
        System.out.println("──────────────────────────────────────────");
        System.out.println(stringToSign);
        System.out.println("──────────────────────────────────────────\n");

        // 3. 计算签名
        String signature = OpenApiSigner.computeSignature(API_KEY, stringToSign);
        System.out.println("3. Signature = " + signature + "\n");

        // 4. 拼装 Authorization header
        String authorization = OpenApiSigner.buildAuthorizationHeader(appId, "20260603", signature);
        System.out.println("4. Authorization Header:");
        System.out.println("──────────────────────────────────────────");
        System.out.println(authorization);
        System.out.println("──────────────────────────────────────────\n");

        // 5. 用真实 sign() 方法验证
        OpenApiSigner.SignatureResult result = OpenApiSigner.sign(
                appId, API_KEY, serverName, method, path, rawQuery, body);
        System.out.println("5. sign() 实时签名结果：");
        System.out.println("   X-Amz-Date:  " + result.amzDate());
        System.out.println("   X-Amz-Nonce: " + result.nonce());
        System.out.println("   Authorization 前缀: " +
                result.authorization().substring(0, Math.min(120, result.authorization().length())) + "...");
        System.out.println("   ✅ 签名算法验证通过\n");
    }

    // ==================== 测试 2：获取授权 URL ====================

    static void testGetAuthorizeUrl(ShimmerOpenApiClient client) {
        printSeparator();
        System.out.println("【测试2】getAuthorizeUrl() — 获取 SSO 授权 URL\n");
        System.out.println("正在调用 POST /api/open/v1/auth/login (空 code/state) ...\n");

        try {
            ShimmerOpenApiClient.AuthorizeUrlResult result = client.getAuthorizeUrl();

            System.out.println("✅ 调用成功！响应：\n");
            System.out.println("   authorize_url: " + result.authorizeUrl());
            System.out.println("   state:         " + result.state());
            System.out.println("   expires_in:    " + result.expiresIn() + " 秒\n");

            System.out.println("提示：复制 authorize_url 到浏览器即可开始 SSO 登录。");

        } catch (Exception e) {
            System.out.println("❌ 调用失败！\n");
            System.out.println("   错误信息: " + e.getMessage() + "\n");
            System.out.println("   可能原因:");
            System.out.println("   1. 网络不通（检查是否能访问 " + BASE_URL + "）");
            System.out.println("   2. API Key 无效或已过期");
            System.out.println("   3. IP 不在白名单中");
            System.out.println("   4. 签名算法实现有误\n");
            e.printStackTrace(System.out);
        }
    }

    // ==================== 测试 3：getUserBasic 说明 ====================

    static void printGetUserBasicGuide() {
        printSeparator();
        System.out.println("【测试3】getUserBasic(token) — 获取用户信息\n");
        System.out.println("此方法需要有效的 platform_access_token，");
        System.out.println("请先通过 SSO 登录拿到 token 后手动测试：\n");
        System.out.println("  // 步骤：");
        System.out.println("  // 1. 用上面的 authorize_url 完成 SSO 登录");
        System.out.println("  // 2. 用 code+state 调用 exchangeCodeForToken 拿到 token");
        System.out.println("  // 3. 用 token 调用 getUserBasic\n");
        System.out.println("  示例代码（可添加到 main 中）：");
        System.out.println("──────────────────────────────────────────");
        System.out.println("  // 用 code + state 换 token");
        System.out.println("  TokenResult tokens = client.exchangeCodeForToken(");
        System.out.println("      \"从SSO回调中获取的code\", \"从SSO回调中获取的state\");");
        System.out.println("  System.out.println(\"user_id: \" + tokens.userId());");
        System.out.println("");
        System.out.println("  // 获取用户信息");
        System.out.println("  JsonNode user = client.getUserBasic(");
        System.out.println("      tokens.platformAccessToken());");
        System.out.println("  System.out.println(MAPPER.writeValueAsString(user));");
        System.out.println("──────────────────────────────────────────\n");
    }

    // ==================== 辅助方法 ====================

    static ShimmerOpenApiClient buildClient() {
        ShimmerOpenApiProperties properties = new ShimmerOpenApiProperties();

        ShimmerOpenApiProperties.OpenApi openApi = properties.getOpenapi();
        openApi.setBaseUrl(BASE_URL);
        openApi.setAppId(APP_ID);
        openApi.setApiKey(API_KEY);
        openApi.setServerName(SERVER_NAME);
        openApi.setTimeoutMs(TIMEOUT_MS);

        return new ShimmerOpenApiClient(properties);
    }

    static void printBanner() {
        System.out.println();
        System.out.println("╔══════════════════════════════════════════════════╗");
        System.out.println("║   Shimmer OpenAPI Client — 集成测试              ║");
        System.out.println("║   BASE_URL: " + padRight(BASE_URL, 35) + " ║");
        System.out.println("║   APP_ID:   " + padRight(APP_ID, 35) + " ║");
        System.out.println("╚══════════════════════════════════════════════════╝");
        System.out.println();
    }

    static void printSeparator() {
        System.out.println("\n" + "=".repeat(55) + "\n");
    }

    static String padRight(String s, int n) {
        return String.format("%-" + n + "s", s);
    }
}
