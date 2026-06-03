package com.qingquan.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

/**
 * 静态图片资源 Controller。
 *
 * <p>将前端 public/ 目录下的图片通过后端 API 提供，统一缓存策略。
 * 图片路径由 {@code app.images.base-path} 配置（默认 ../public）。</p>
 *
 * <h3>端点</h3>
 * <table>
 *   <tr><td>GET /api/images/victory/{id}</td><td>胜利图片 (victory_01~100.png)</td></tr>
 *   <tr><td>GET /api/images/tile/{index}</td><td>砖块图标 (tile01~99.png)</td></tr>
 *   <tr><td>GET /api/images/decorations/{name}</td><td>装饰图（防路径遍历）</td></tr>
 *   <tr><td>GET /api/images/favicon.svg</td><td>网站图标</td></tr>
 * </table>
 *
 * <h3>安全</h3>
 * <ul>
 *   <li>路径遍历防护：{@code ..}、{@code /}、{@code \} 被拦截</li>
 *   <li>参数校验：id/index 有范围限制</li>
 *   <li>所有响应设 X-Content-Type-Options: nosniff</li>
 * </ul>
 *
 * <h3>缓存</h3>
 * <ul>
 *   <li>ETag：MD5(文件内容)</li>
 *   <li>Last-Modified：文件系统修改时间</li>
 *   <li>Cache-Control: public, max-age=3600, must-revalidate</li>
 * </ul>
 *
 * <h3>注意</h3>
 * errorJson() 方法使用字符串拼接，但所有 message 均为硬编码常量 / 在参数校验之前，
 * 不包含用户输入，故无 XSS 风险。
 */
@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final Path basePath;

    /** @param basePath 图片根目录，由 application.yml 注入（默认 ../public） */
    public ImageController(@Value("${app.images.base-path:../public}") String basePath) {
        this.basePath = Paths.get(basePath).toAbsolutePath().normalize();
    }

    /**
     * 获取胜利图片。
     * @param id 图片编号，范围 1~100
     * @param token 预留认证参数（当前可选）
     */
    @GetMapping("/victory/{id}")
    public ResponseEntity<?> getVictoryImage(@PathVariable int id,
                                              @RequestParam(required = false) String token) {
        if (id < 1 || id > 100) {
            return ResponseEntity.badRequest().body(errorJson(400, "无效的图片ID"));
        }

        String filename = String.format("victory_%02d.png", id);
        Path filePath = basePath.resolve("victory_images").resolve(filename);
        return serveImage(filePath, "image/png");
    }

    /**
     * 获取砖块图标。
     * @param index 图标编号，范围 1~99
     */
    @GetMapping("/tile/{index}")
    public ResponseEntity<?> getTileImage(@PathVariable int index,
                                           @RequestParam(required = false) String token) {
        if (index < 1 || index > 99) {
            return ResponseEntity.badRequest().body(errorJson(400, "无效的图标索引"));
        }

        String filename = String.format("tile%02d.png", index);
        Path filePath = basePath.resolve("custom-icons").resolve(filename);
        return serveImage(filePath, "image/png");
    }

    /**
     * 获取装饰图片。
     * 路径遍历防护：拒绝含 {@code ..}、{@code /}、{@code \} 的请求。
     * @param name 文件名（仅文件名，不允许路径）
     */
    @GetMapping("/decorations/{name}")
    public ResponseEntity<?> getDecoration(@PathVariable String name,
                                            @RequestParam(required = false) String token) {
        if (name.contains("..") || name.contains("/") || name.contains("\\")) {
            return ResponseEntity.badRequest().body(errorJson(400, "无效的文件名"));
        }

        Path filePath = basePath.resolve("decorations").resolve(name);
        return serveImage(filePath, "image/png");
    }

    /** 获取网站 favicon */
    @GetMapping("/favicon.svg")
    public ResponseEntity<?> getFavicon(@RequestParam(required = false) String token) {
        Path filePath = basePath.resolve("favicon.svg");
        return serveImage(filePath, "image/svg+xml");
    }

    /**
     * 统一的图片文件读取与缓存响应构建。
     *
     * @param filePath           文件绝对路径
     * @param defaultContentType 文件类型探测失败时的默认 Content-Type
     * @return 200 + 图片字节 + 缓存头；404 若文件不存在；500 若读取失败
     */
    private ResponseEntity<?> serveImage(Path filePath, String defaultContentType) {
        if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(errorJson(404, "图片不存在"));
        }

        try {
            byte[] data = Files.readAllBytes(filePath);
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = defaultContentType;
            }

            String etag = computeETag(data);
            ZonedDateTime lastModified = Files.getLastModifiedTime(filePath)
                    .toInstant().atZone(ZoneOffset.UTC);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .contentLength(data.length)
                    .eTag(etag)
                    .lastModified(lastModified.toInstant().toEpochMilli())
                    .cacheControl(CacheControl.maxAge(3600, java.util.concurrent.TimeUnit.SECONDS)
                            .cachePublic()
                            .mustRevalidate())
                    .header("X-Content-Type-Options", "nosniff")
                    .body(data);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(errorJson(500, "图片读取失败"));
        }
    }

    /** 计算文件内容的 MD5 哈希作为 ETag */
    private String computeETag(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(data);
            return "\"" + HexFormat.of().formatHex(digest) + "\"";
        } catch (NoSuchAlgorithmException e) {
            return "\"" + data.length + "-" + System.currentTimeMillis() + "\"";
        }
    }

    /** 构造简单 JSON 错误体（message 为硬编码常量，无 XSS 风险） */
    private String errorJson(int code, String message) {
        return "{\"code\":" + code + ",\"msg\":\"" + message + "\"}";
    }
}
