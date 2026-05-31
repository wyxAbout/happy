package com.qingquan.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public final class AwsV4Signer {

    private static final String ALGORITHM = "AWS4-HMAC-SHA256";
    private static final String TERMINATOR = "aws4_request";
    private static final ZoneOffset UTC = ZoneOffset.UTC;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(UTC);
    private static final DateTimeFormatter TIMESTAMP_FMT = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(UTC);

    private AwsV4Signer() {}

    public static SignedRequest sign(String appId, String apiKey,
                                      URI uri, String httpMethod,
                                      String amzNonce, String serverName,
                                      byte[] payload) {

        ZonedDateTime now = ZonedDateTime.now(UTC);
        String dateStamp = DATE_FMT.format(now);
        String timestamp = TIMESTAMP_FMT.format(now);

        String rawPath = uri.getRawPath() != null && !uri.getRawPath().isEmpty() ? uri.getRawPath() : "/";
        String rawQuery = uri.getRawQuery() != null ? uri.getRawQuery() : "";
        String bodyHash = sha256Hex(payload != null ? payload : new byte[0]);
        String queryHash = sha256Hex(rawQuery.getBytes(StandardCharsets.UTF_8));

        String canonicalRequest = httpMethod + "\n"
                + rawPath + "\n"
                + queryHash + "\n"
                + bodyHash + "\n"
                + timestamp + "\n"
                + amzNonce + "\n"
                + appId + "\n"
                + serverName;

        String credentialScope = dateStamp + "/shimmer/openapi/" + TERMINATOR;

        String stringToSign = ALGORITHM + "\n"
                + timestamp + "\n"
                + credentialScope + "\n"
                + sha256Hex(canonicalRequest.getBytes(StandardCharsets.UTF_8));

        String signingSecret = sha256Hex(apiKey.getBytes(StandardCharsets.UTF_8));
        String signature = bytesToHex(hmacSha256(("AWS4" + signingSecret).getBytes(StandardCharsets.UTF_8), stringToSign));

        String signedHeaders = "host;x-amz-date;x-amz-nonce";
        String authorization = ALGORITHM + " "
                + "Credential=" + appId + "/" + credentialScope + ", "
                + "SignedHeaders=" + signedHeaders + ", "
                + "Signature=" + signature;

        Map<String, String> resultHeaders = new LinkedHashMap<>();
        resultHeaders.put("X-Amz-Date", timestamp);
        resultHeaders.put("X-Amz-Nonce", amzNonce);
        resultHeaders.put("X-OpenAPI-Server-Name", serverName);
        resultHeaders.put("Authorization", authorization);

        return new SignedRequest(resultHeaders, authorization);
    }

    private static byte[] hmacSha256(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 failed", e);
        }
    }

    public static String sha256Hex(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return bytesToHex(md.digest(data));
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 failed", e);
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public static class SignedRequest {
        private final Map<String, String> headers;
        private final String authorization;

        SignedRequest(Map<String, String> headers, String authorization) {
            this.headers = Collections.unmodifiableMap(headers);
            this.authorization = authorization;
        }

        public Map<String, String> getHeaders() {
            return headers;
        }

        public String getAuthorization() {
            return authorization;
        }
    }
}
