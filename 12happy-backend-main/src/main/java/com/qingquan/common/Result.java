package com.qingquan.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import java.io.Serializable;

/**
 * 通用返回结果
 * 脚手架核心类
 * @param <T> 泛型，指定 data 类型
 */
@Data
public class Result<T> implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 成功
     */
    public static final int SUCCESS = 200;

    /**
     * 参数错误
     */
    public static final int BAD_REQUEST = 400;

    /**
     * 未登录
     */
    public static final int UNAUTHORIZED = 401;

    /**
     * 权限不足
     */
    public static final int FORBIDDEN = 403;

    /**
     * 不存在
     */
    public static final int NOT_FOUND = 404;

    /**
     * 系统异常
     */
    public static final int ERROR = 500;

    /**
     * 返回状态码
     */
    private int code;

    /**
     * 返回消息
     */
    private String msg;

    /**
     * 返回数据
     */
    @JsonInclude(JsonInclude.Include.NON_NULL) // 为 null 不返回
    private T data;

    // =============== 成功 ===============

    public static <T> Result<T> success() {
        Result<T> result = new Result<>();
        result.setCode(SUCCESS);
        result.setMsg("操作成功");
        return result;
    }

    public static <T> Result<T> success(T data) {
        Result<T> result = success();
        result.setData(data);
        return result;
    }

    public static <T> Result<T> success(String msg, T data) {
        Result<T> result = new Result<>();
        result.setCode(SUCCESS);
        result.setMsg(msg);
        result.setData(data);
        return result;
    }

    // =============== 失败 ===============

    public static <T> Result<T> error() {
        Result<T> result = new Result<>();
        result.setCode(ERROR);
        result.setMsg("系统异常");
        return result;
    }

    public static <T> Result<T> error(String msg) {
        Result<T> result = new Result<>();
        result.setCode(ERROR);
        result.setMsg(msg);
        return result;
    }

    public static <T> Result<T> error(int code, String msg) {
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMsg(msg);
        return result;
    }

}