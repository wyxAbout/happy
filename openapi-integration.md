# Shimmer Shop OpenAPI 对接文档

> 本文档面向第三方/外部系统对接，独立描述 OpenAPI 的认证、签名、安全校验、接口和错误处理。

## 1. 基础信息

| 项 | 内容 |
|---|---|
| 服务模块 | `openapi-service` |
| 对外前缀 | `/api/open/v1` |
| 响应格式 | `code/message/request_id/data` |

## 2. 安全模型

OpenAPI 请求同时需要：

1. API Key 应用身份。
2. 精简 AWSv4 签名。
3. 调用 IP 白名单。
4. 调用服务器白名单。
5. nonce 防重放。
6. scope 权限。
7. 用户态接口的平台登录 token。
8. 写接口幂等键。
9. 审计记录。

## 3. 通用请求头

| Header | 必填 | 说明 |
|---|---|---|
| `Authorization` | 是 | 精简 AWSv4 签名。格式见下文。 |
| `X-Amz-Date` | 是 | UTC 时间，格式 `yyyyMMddTHHmmssZ`，默认允许 ±5 分钟。 |
| `X-Amz-Nonce` | 是 | 随机串，窗口期内不可重复。 |
| `X-OpenAPI-Server-Name` | 是 | 调用服务器名，必须命中应用服务器白名单。 |
| `X-Platform-Access-Token` | 用户态接口必填 | 除登录/刷新/退出外，服务端从该平台登录态提取当前 `user_id`。 |
| `X-Idempotency-Key` | 写接口必填 | 幂等键，8-128 字符。 |

## 4. Authorization 签名

格式：

```http
Authorization: AWS4-HMAC-SHA256 Credential=<app_id>/<yyyymmdd>/shimmer/openapi/aws4_request, SignedHeaders=host;x-amz-date;x-amz-nonce, Signature=<hex_signature>
```

### 4.1 CanonicalRequest

```text
METHOD
PATH
SHA256(raw_query)
SHA256(body)
X-Amz-Date
X-Amz-Nonce
app_id
X-OpenAPI-Server-Name
```

### 4.2 StringToSign

```text
AWS4-HMAC-SHA256
X-Amz-Date
yyyymmdd/shimmer/openapi/aws4_request
SHA256(CanonicalRequest)
```

### 4.3 签名密钥

数据库只保存 `sha256(api_key)`，API Key 明文只在创建/轮换时返回一次。调用方本地计算：

```text
signing_secret = sha256(api_key)
hex_signature = HMAC-SHA256("AWS4" + signing_secret, StringToSign)
```

## 5. Scope 权限

| Scope | 说明 |
|---|---|
| `auth:login` | SSO 登录、刷新、退出 |
| `user:read` | 读取当前登录用户基础信息 |
| `user:read_sensitive` | 读取未脱敏手机号/邮箱 |
| `point:account:read` | 读取当前登录用户积分账户 |
| `point:transaction:read` | 读取当前登录用户积分流水 |
| `point:grant` | 给当前登录用户发放积分 |

## 6. 对外接口

### 6.1 SSO 登录

```http
POST /api/open/v1/auth/login
```

**Scope：** `auth:login`

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | string | 是 | SSO 授权码 |
| `state` | string | 是 | SSO state |
| `device_id` | string | 否 | 设备 ID |

**响应 data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `platform_access_token` | string | 平台 access token |
| `platform_refresh_token` | string | 平台 refresh token |
| `expires_in` | int64 | 过期秒数 |
| `user_id` | string | 登录用户 ID |

### 6.2 Token 刷新

```http
POST /api/open/v1/auth/token/refresh
```

**Scope：** `auth:login`

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `refresh_token` | string | 是 | 平台 refresh token |
| `device_id` | string | 否 | 设备 ID |

### 6.3 退出登录

```http
POST /api/open/v1/auth/logout
```

**Scope：** `auth:login`

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `access_token` | string | 否 | 平台 access token |
| `refresh_token` | string | 否 | 平台 refresh token |
| `device_id` | string | 否 | 设备 ID |

至少提供 `access_token` 或 `refresh_token`。

### 6.4 获取当前用户基础信息

```http
POST /api/open/v1/user/basic/get
```

**Scope：** `user:read`

**用户来源：** `X-Platform-Access-Token`

请求体无需传 `user_id`。手机号/邮箱默认脱敏；调用方具备 `user:read_sensitive` 时返回明文。

### 6.5 获取当前用户积分账户

```http
POST /api/open/v1/point/account/get
```

**Scope：** `point:account:read`

**用户来源：** `X-Platform-Access-Token`

请求体无需传 `user_id`。

### 6.6 获取当前用户积分流水

```http
POST /api/open/v1/point/transaction/list
```

**Scope：** `point:transaction:read`

**用户来源：** `X-Platform-Access-Token`

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `transaction_type` | string | 否 | `GRANT` / `FREEZE` / `CONFIRM_FROZEN` / `RELEASE_FROZEN` |
| `page_no` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页数量，1-100 |

### 6.7 给当前登录用户增加积分

```http
POST /api/open/v1/point/grant
```

**Scope：** `point:grant`

**用户来源：** `X-Platform-Access-Token`

**额外 Header：** `X-Idempotency-Key` 必填。

**重要约束：** 请求体禁止传目标 `user_id`，目标用户只能来自平台登录态。

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `rule_code` | string | 否 | 积分规则码 |
| `points` | int64 | 是 | 发放积分，必须 > 0 |
| `biz_type` | string | 是 | 仅支持 `external.reward` / `external.adjustment` / `campaign.reward` |
| `biz_id` | string | 是 | 外部业务唯一 ID，用于标识本次积分发放对应的业务单据/事件。例如签到记录 ID、活动领取记录 ID、订单 ID。建议在同一 `biz_type` 下全局唯一，便于审计、排查和防重复处理。 |
| `remark` | string | 否 | 备注，最长 256 字符 |

**biz_type 说明：**

OpenAPI 积分发放只支持以下 3 种外部业务类型：

| biz_type | 使用场景 | 示例 biz_id |
|---|---|---|
| `external.reward` | 外部系统的正常奖励积分，例如学习任务完成、签到、认证通过等。 | `reward_20260530_0001`、`checkin_20260530_user001` |
| `external.adjustment` | 外部系统的人工调账、补偿、纠错。必须有明确原因，建议在 `remark` 写清楚。 | `adjust_20260530_ticket123`、`compensation_case_001` |
| `campaign.reward` | 活动/营销类奖励积分，例如专题活动、运营活动、抽奖中奖等。 | `campaign_2026_spring_user001`、`lottery_win_001` |

`user.registered`、`activity.points_claimed`、`exchange_order` 属于平台内部业务来源，不允许 OpenAPI 对接方使用。

**biz_id 说明：**

`biz_id` 是调用方侧的业务唯一标识，不由 OpenAPI 生成。它用于把积分流水和外部业务事件关联起来。

建议调用方保证同一 `biz_type + biz_id` 代表同一个业务事件；如果同一个业务事件重试调用，应复用同一个 `X-Idempotency-Key`。

**安全校验：**

- API Key 签名通过。
- 调用 IP 命中 `allowed_ips`。
- `X-OpenAPI-Server-Name` 命中 `allowed_server_names`。
- `X-Platform-Access-Token` 有效。
- 具备 `point:grant` scope。
- `X-Idempotency-Key` 有效。
- 未超过单次积分发放限额。
- 未超过 24 小时累计积分发放限额。

## 7. 错误处理

失败响应统一为：

```json
{
  "code": 401,
  "message": "OpenAPI 调用认证失败",
  "request_id": "req_xxx",
  "data": null
}
```

安全相关失败不会区分暴露具体原因，例如 key 不存在、签名错误、IP 不命中、nonce 重放等都应视为认证/权限失败，并进入审计。

## 8. 审计

OpenAPI 调用审计记录：

- `request_id`
- `app_id`
- `endpoint`
- `method`
- `client_ip`
- `server_name`
- `target_user_id`
- `scope`
- `result`
- `error_code`
- `idempotency_key`
- `body_hash`
- `points`
- `created_at`

敏感字段如 password/token/api_key/authorization 不记录明文。
