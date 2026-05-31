package com.qingquan.controller;

import com.qingquan.service.OpenApiLoginService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

@Slf4j
@RestController
@RequestMapping("/api/openapi")
@RequiredArgsConstructor
public class OpenApiProxyController {

    private final OpenApiLoginService loginService;

    @RequestMapping(value = "/**", method = {
            RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
            RequestMethod.DELETE, RequestMethod.PATCH
    })
    public ResponseEntity<String> proxy(HttpServletRequest request, @RequestBody(required = false) byte[] body) {
        String platformAccessToken = (String) request.getAttribute("platformAccessToken");
        if (platformAccessToken == null || platformAccessToken.isEmpty()) {
            return ResponseEntity.status(401)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"code\":401,\"message\":\"未登录或登录已过期\"}");
        }

        String method = request.getMethod();
        String proxyPath = request.getRequestURI().replaceFirst("^/api/openapi", "");
        String query = request.getQueryString();
        String contentType = request.getContentType();

        if (body == null) {
            body = new byte[0];
        }

        log.info("Proxy {} {} (query={}, bodySize={})", method, proxyPath, query, body.length);

        try {
            String responseBody = loginService.proxyRequest(
                    platformAccessToken, method, proxyPath, query, body, contentType
            );

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(responseBody);

        } catch (OpenApiLoginService.OpenApiException e) {
            log.warn("Proxy failed: {} {} -> {}", method, proxyPath, e.getCode());
            String errorBody = String.format(
                    "{\"code\":%d,\"message\":\"%s\"}",
                    e.getCode(),
                    escapeJson(e.getMessage())
            );
            return ResponseEntity.status(e.getCode() >= 400 ? e.getCode() : 500)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(errorBody);
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
