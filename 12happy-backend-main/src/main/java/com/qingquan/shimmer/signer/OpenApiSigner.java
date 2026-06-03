package com.qingquan.shimmer.signer;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Shimmer OpenAPI 精简 AWSv4 HMAC-SHA256 签名器。
 *
 * <h3>签名流程</h3>
 * <pre>
 * 1. 构建 CanonicalRequest
 * 2. 构建 StringToSign
 * 3. signing_secret = sha256(api_key)
 * 4. signature = HMAC-SHA256("AWS4" + signing_secret, StringToSign)
 * 5. 拼装 Authorization header
 * </pre>
 *
 * <h3>CanonicalRequest（7 行）</h3>
 * <pre>
 * METHOD
 * PATH
 * SHA256(raw_query)
 * SHA256(body)
 * X-Amz-Date
 * X-Amz-Nonce
 * app_id
 * X-OpenAPI-Server-Name
 * </pre>
 *
 * @see "openapi-integration-v1.2.md §4 Authorization 签名"
 */
public final class OpenApiSigner {

    private static final DateTimeFormatter AMZ_DATE_FMT =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);

    private static final String ALGORITHM = "AWS4-HMAC-SHA256";
    private static final String SERVICE = "shimmer";
    private static final String REGION = "openapi";
    private static final String TERMINATION = "aws4_request";

    private OpenApiSigner() { /* utility class */ }

    /**
     * 对一次 OpenAPI 请求生成完整的 Authorization header 值。
     *
     * @param appId     OpenAPI 应用 ID
     * @param apiKey    明文 API Key（仅用于本地签名计算）
     * @param serverName 调用服务器名
     * @param method    HTTP 方法（GET/POST）
     * @param path      请求路径（如 /api/open/v1/auth/login）
     * @param rawQuery  原始查询串（不含 ?），无则为空串
     * @param body      请求体，GET 请求传空串
     * @return Authorization header 完整值，不含 "Authorization: " 前缀
     */
    public static SignatureResult sign(String appId,
                                       String apiKey,
                                       String serverName,
                                       String method,
                                       String path,
                                       String rawQuery,
                                       String body) {
        String amzDate = AMZ_DATE_FMT.format(Instant.now());
        String date = DATE_FMT.format(Instant.now());
        String nonce = UUID.randomUUID().toString();

        String canonicalRequest = buildCanonicalRequest(
                method, path, rawQuery, body, amzDate, nonce, appId, serverName);

        String stringToSign = buildStringToSign(amzDate, date, canonicalRequest);

        String signature = computeSignature(apiKey, stringToSign);

        String authorization = buildAuthorizationHeader(appId, date, signature);

        return new SignatureResult(authorization, amzDate, nonce);
    }

    /**
     * 构建 CanonicalRequest（7 行，LF 分隔）。
     */
    public static String buildCanonicalRequest(String method,
                                        String path,
                                        String rawQuery,
                                        String body,
                                        String amzDate,
                                        String nonce,
                                        String appId,
                                        String serverName) {
        return method + "\n"
                + path + "\n"
                + sha256Hex(rawQuery != null ? rawQuery : "") + "\n"
                + sha256Hex(body != null ? body : "") + "\n"
                + amzDate + "\n"
                + nonce + "\n"
                + appId + "\n"
                + serverName;
    }

    /**
     * 构建 StringToSign（4 行，LF 分隔）。
     */
    public static String buildStringToSign(String amzDate, String date, String canonicalRequest) {
        return ALGORITHM + "\n"
                + amzDate + "\n"
                + date + "/" + SERVICE + "/" + REGION + "/" + TERMINATION + "\n"
                + sha256Hex(canonicalRequest);
    }

    /**
     * 计算签名。
     * <pre>
     * signing_secret = sha256(api_key)
     * signature = HMAC-SHA256("AWS4" + signing_secret, StringToSign)
     * </pre>
     */
    public static String computeSignature(String apiKey, String stringToSign) {
        String signingSecret = sha256Hex(apiKey);
        String hmacKey = "AWS4" + signingSecret;
        return hmacSha256Hex(hmacKey, stringToSign);
    }

    /**
     * 拼装 Authorization header 值。
     */
    public static String buildAuthorizationHeader(String appId, String date, String signature) {
        return ALGORITHM + " "
                + "Credential=" + appId + "/" + date + "/" + SERVICE + "/" + REGION + "/" + TERMINATION + ", "
                + "SignedHeaders=host;x-amz-date;x-amz-nonce, "
                + "Signature=" + signature;
    }

    // ===== 工具方法 =====

    public static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public static String hmacSha256Hex(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                    key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] result = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(result);
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 not available", e);
        }
    }

    // ===== 结果类型 =====

    /**
     * 签名结果，包含 Authorization header 值和需要随请求发送的 header 值。
     */
    public record SignatureResult(
            /** 完整的 Authorization header 值 */
            String authorization,
            /** X-Amz-Date header 值 */
            String amzDate,
            /** X-Amz-Nonce header 值 */
            String nonce
    ) {}
}
