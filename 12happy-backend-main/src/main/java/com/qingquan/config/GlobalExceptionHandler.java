package com.qingquan.config;

import com.qingquan.common.Result;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * 全局异常处理器。
 *
 * <p>统一拦截 Controller 层抛出的异常，转换为标准 Result 响应体，
 * 替代各 Controller 中重复的 try-catch 样板代码。</p>
 *
 * <h3>映射规则</h3>
 * <table>
 *   <tr><td>IllegalArgumentException("无权")</td><td>→ 403 FORBIDDEN</td></tr>
 *   <tr><td>IllegalArgumentException("不存在")</td><td>→ 404 NOT_FOUND</td></tr>
 *   <tr><td>IllegalArgumentException("数量不足")</td><td>→ 400 BAD_REQUEST</td></tr>
 *   <tr><td>IllegalArgumentException(其他)</td><td>→ 400 BAD_REQUEST</td></tr>
 *   <tr><td>MethodArgumentNotValidException</td><td>→ 400 参数校验失败</td></tr>
 *   <tr><td>Exception(兜底)</td><td>→ 500 INTERNAL_SERVER_ERROR</td></tr>
 * </table>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public Result<Void> handleIllegalArgument(IllegalArgumentException e) {
        String msg = e.getMessage();
        int status;
        if (msg != null && msg.contains("无权")) {
            status = 403;
        } else if (msg != null && msg.contains("不存在")) {
            status = 404;
        } else if (msg != null && msg.contains("数量不足")) {
            status = 400;
        } else {
            status = 400;
        }
        return Result.error(status, msg != null ? msg : "请求参数错误");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleValidation(MethodArgumentNotValidException e) {
        String fields = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return Result.error(400, "参数校验失败: " + fields);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<Void> handleGeneral(Exception e) {
        return Result.error(500, "服务器内部错误: " + e.getMessage());
    }
}
