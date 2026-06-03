# 12happy 后端项目技术批注文档

---

## 一、项目概述

| 项目名称   | 12happy-backend（开心消消乐后端服务）                   |
| ---------- | ------------------------------------------------------- |
| 技术栈     | Java 21 + Spring Boot 3.5.13 + MyBatis 3.0.5 + MySQL    |
| 构建工具   | Maven Wrapper (Apache Maven 3.9.14)                      |
| 基础包路径 | `com.qingquan`                                           |
| 默认端口   | `5022`（可通过 `SERVER_PORT` 环境变量覆盖）              |
| 数据库     | MySQL 8.x，数据库名 `12happy`，字符集 UTF-8              |
| 核心功能   | 卡牌图鉴收集、图片兑换、静态图片资源服务                  |

---

## 二、文件夹整体结构

```
12happy-backend-main/
├── .mvn/wrapper/              # Maven Wrapper 配置（免安装 Maven 即可构建）
│   └── maven-wrapper.properties
├── images/                     # 静态图片资源（由 ImageController 对外服务）
│   ├── custom-icons/          # 游戏砖块图标 tile01~06.png + config.json
│   ├── decorations/           # 装饰图 decoration-left.png
│   ├── victory_images/        # 胜利图 victory_01~24.png
│   └── favicon.svg            # 网站图标
├── sql/                       # 数据库初始化脚本
│   └── base.sql               # 建表 + 种子数据
├── src/
│   ├── main/java/com/qingquan/  # Java 源码
│   │   ├── common/             # 通用类（统一返回体）
│   │   ├── config/             # 配置类（过滤器、CORS、异常处理、拦截器注册）
│   │   ├── context/            # 请求上下文（ThreadLocal 用户身份绑定）
│   │   ├── controller/         # REST 控制器
│   │   ├── dto/                # 数据传输对象（请求体）
│   │   ├── entity/             # 数据实体（映射数据库表）
│   │   ├── interceptor/        # 拦截器
│   │   ├── mapper/             # MyBatis Mapper 接口
│   │   └── service/            # 业务逻辑接口 + impl 实现
│   ├── main/resources/
│   │   ├── mapper/             # MyBatis XML SQL 映射文件
│   │   │   ├── CardTypeMapper.xml
│   │   │   └── UserCardMapper.xml
│   │   └── application.yml     # 应用主配置（含多环境 profile）
│   └── test/                   # 单元测试（基础上下文加载测试）
├── pom.xml                     # Maven 依赖与构建配置
├── mvnw / mvnw.cmd             # Maven Wrapper 启动脚本（Linux/Windows）
├── .gitignore / .gitattributes # Git 配置
└── README.md                   # 项目简要说明
```

### 子目录功能划分

| 目录                  | 职责说明                                                     |
| --------------------- | ------------------------------------------------------------ |
| `common/`             | 通用返回值封装类 `Result<T>`，统一 API 响应的 code/msg/data 结构 |
| `config/`             | Spring 配置类：全局异常处理、API Key 认证过滤器、CORS 跨域、安全响应头、MVC 拦截器注册 |
| `context/`            | `UserContext` — 基于 ThreadLocal 的当前请求用户身份绑定，由拦截器写入、Service 层读取 |
| `controller/`         | REST API 端点：卡牌类型管理、用户卡牌管理、图片资源服务、健康检查 |
| `dto/`                | 请求体 DTO：`ExchangeRequest`（图片兑换请求）                |
| `entity/`             | 数据实体类：`CardType`（卡牌类型）、`UserCard`（用户卡牌），均使用 Lombok @Data |
| `interceptor/`        | `UserContextInterceptor` — 从请求头 `X-User-Id` 提取用户身份写入 ThreadLocal |
| `mapper/`             | MyBatis Mapper 接口，声明 SQL 方法（通过 XML 映射实现）      |
| `service/` + `impl/`  | 业务逻辑层：接口定义 + 实现类，包含所有权校验、兑换事务等核心逻辑 |

---

## 三、技术架构分层图

```
浏览器 / 前端 fetch
        │
        ▼
┌─────────────────────────────────┐
│  SecurityHeadersFilter          │  @Order(1) — 统一安全响应头
├─────────────────────────────────┤
│  CorsFilter (Spring CORS)       │  — 跨域白名单校验
├─────────────────────────────────┤
│  ApiKeyFilter                   │  @Order(2) — X-Api-Key 认证（排除 /api/images/**）
├─────────────────────────────────┤
│  UserContextInterceptor         │  — X-User-Id → ThreadLocal
├─────────────────────────────────┤
│  Controller 层                  │  — 参数校验(@Valid) → 调用 Service → 返回 Result
├─────────────────────────────────┤
│  Service 层                     │  — 业务逻辑 + 所有权校验 + @Transactional
├─────────────────────────────────┤
│  Mapper 层                      │  — MyBatis 接口 → XML SQL
├─────────────────────────────────┤
│  MySQL (12happy)                │  — card_types / user_cards
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  GlobalExceptionHandler         │  — 统一异常 → Result(code, msg)
└─────────────────────────────────┘
```

---

## 四、API 接口设计说明

### 4.1 统一返回体 `Result<T>`

**文件位置**：[Result.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/common/Result.java)

所有 API 返回以下 JSON 结构：

```json
{
  "code": 200,        // HTTP 语义状态码 (200/400/401/403/404/500)
  "msg": "操作成功",   // 人类可读提示信息
  "data": {...}       // 业务数据（null 时不序列化）
}
```

**状态码约定**：
| 常量          | 值  | 含义         | 触发场景                               |
| ------------- | --- | ------------ | -------------------------------------- |
| `SUCCESS`     | 200 | 成功         | 正常返回                               |
| `BAD_REQUEST` | 400 | 参数错误     | 参数校验失败、兑换数量不足、非法参数   |
| `UNAUTHORIZED`| 401 | 未授权       | X-Api-Key 缺失或无效                   |
| `FORBIDDEN`   | 403 | 权限不足     | 越权操作（操作非本人数据）             |
| `NOT_FOUND`   | 404 | 不存在       | 资源不存在、卡牌类型/记录不存在        |
| `ERROR`       | 500 | 服务器错误   | 兜底异常                               |

### 4.2 API 端点清单

#### 4.2.1 健康检查 — [WebController.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/controller/WebController.java)

| 方法 | 路径      | 说明               | 无需认证 |
| ---- | --------- | ------------------ | -------- |
| GET  | `/hello`  | 服务健康检查，返回欢迎信息 | ✓        |

#### 4.2.2 卡牌类型管理 — [CardTypeController.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/controller/CardTypeController.java)

**路径前缀**：`/api/card-types`

| 方法   | 路径            | 说明                                   | 请求体             |
| ------ | --------------- | -------------------------------------- | ------------------ |
| GET    | `/api/card-types`           | 查询卡牌类型列表                       | 可选 query: `isEnable`（1=仅启用的，null=全部） |
| GET    | `/api/card-types/{id}`      | 按 ID 查单个卡牌类型                   | —                  |
| POST   | `/api/card-types`           | 新增卡牌类型                           | CardType JSON      |
| PUT    | `/api/card-types`           | 更新卡牌类型（id 必填）                | CardType JSON      |
| DELETE | `/api/card-types/{id}`      | 删除卡牌类型                           | —                  |

#### 4.2.3 用户卡牌管理 — [UserCardController.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/controller/UserCardController.java)

**路径前缀**：`/api/user-cards`

| 方法   | 路径                                   | 说明                                      | 关键逻辑                                        |
| ------ | -------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| GET    | `/api/user-cards`                      | 查卡牌（可选 `?userId=` 过滤）            | 带 userId 时触发所有权校验                      |
| GET    | `/api/user-cards/user/{userId}`        | 按路径参数查指定用户全部卡牌              | 所有权校验                                      |
| GET    | `/api/user-cards/{id}`                 | 按主键查单张卡牌                          | 所有权校验                                      |
| POST   | `/api/user-cards`                      | 新增卡牌（游戏掉落用）                    | userId/cardTypeId/source 必填，所有权校验        |
| PUT    | `/api/user-cards`                      | 更新卡牌                                  | 所有权校验                                      |
| DELETE | `/api/user-cards/{id}`                 | 删除单张卡牌                              | 所有权校验                                      |
| DELETE | `/api/user-cards/user/{userId}/all`    | **图鉴重置**：删除用户所有卡牌            | 返回删除记录数                                  |
| POST   | `/api/user-cards/exchange`             | **图片兑换**：4 张同类型 → 1 张目标       | 核心业务，见下节详解                            |

#### 4.2.4 图片资源 — [ImageController.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/controller/ImageController.java)

**路径前缀**：`/api/images`（**无需 X-Api-Key 认证**）

| 方法 | 路径                              | 说明                         | 缓存策略                              |
| ---- | --------------------------------- | ---------------------------- | ------------------------------------- |
| GET  | `/api/images/victory/{id}`        | 胜利图（id: 1~100）          | ETag(MD5) + Last-Modified + max-age=3600 + must-revalidate |
| GET  | `/api/images/tile/{index}`        | 砖块图标（index: 1~99）      | 同上                                  |
| GET  | `/api/images/decorations/{name}`  | 装饰图（防路径遍历）         | 同上                                  |
| GET  | `/api/images/favicon.svg`         | 网站 favicon                 | 同上                                  |

> **安全措施**：
> - 路径遍历防护：拒绝含 `..`、`/`、`\` 的请求
> - 参数范围校验：victory id 1~100，tile index 1~99
> - 响应头 `X-Content-Type-Options: nosniff`
> - 响应头 `Cache-Control: public, max-age=3600, must-revalidate`

### 4.3 核心业务：图片兑换（exchange）

**接口**：`POST /api/user-cards/exchange`

**请求体 `ExchangeRequest`**：
```json
{
  "userId": 1,              // 发起兑换的用户 ID，必须与 X-User-Id 一致
  "sourceCardTypeId": 1,    // 要消耗的卡牌类型 ID（1~24，需持有 ≥4 张）
  "targetCardTypeId": 5     // 要获得的卡牌类型 ID（1~24）
}
```

**兑换流程**（`@Transactional` 原子操作）：

```
1. validateOwnership(userId) → 检查 X-User-Id 是否匹配
2. SELECT * FROM user_cards
   WHERE user_id = ? AND card_type_id = ?
   ORDER BY obtained_time ASC LIMIT 4 → 取最早的 4 张来源卡牌
3. IF count < 4 → throw IllegalArgumentException("数量不足") → 400
4. DELETE FROM user_cards WHERE id IN (4个id) → 批量删除
5. INSERT INTO user_cards (user_id, card_type_id, source="exchange") → 新增目标卡牌
6. RETURN 新卡牌记录
```

> ⚠️ **事务保证**：4 张删除 + 1 张新增在同一 `@Transactional` 中，任何一步失败自动回滚，**不会产生"半兑换"状态**。

---

## 五、数据库模型结构

### 5.1 ER 关系

```
┌──────────────────────┐          ┌──────────────────────────┐
│     card_types       │ 1    N   │       user_cards         │
│──────────────────────│◄─────────│──────────────────────────│
│ id (PK, INT)         │          │ id (PK, BIGINT)          │
│ card_name (VARCHAR)  │          │ user_id (BIGINT, INDEX)  │
│ icon (VARCHAR)       │          │ card_type_id (FK → card_types.id) │
│ type_index (TINYINT) │          │ source (VARCHAR)          │
│ is_enable (TINYINT)  │          │ obtained_time (DATETIME)  │
│ create_time (DATETIME)│         │                          │
└──────────────────────┘          └──────────────────────────┘
```

### 5.2 `card_types` — 卡牌种类配置表

| 字段         | 类型              | 说明                                                   |
| ------------ | ----------------- | ------------------------------------------------------ |
| `id`         | INT UNSIGNED (PK) | 卡种主键，自增                                         |
| `card_name`  | VARCHAR(32)       | 卡牌名称，如"第1张卡片"                                |
| `icon`       | VARCHAR(128)      | 图标路径，如 `/victory_images/victory_01`              |
| `type_index` | TINYINT UNSIGNED  | 游戏图标索引(0-5)，对应前端 custom-icons 的 6 种 tile  |
| `is_enable`  | TINYINT(1)        | 是否启用：1=启用，0=禁用（默认 1）                     |
| `create_time`| DATETIME          | 创建时间（默认 CURRENT_TIMESTAMP）                     |

> **种子数据**：base.sql 预置了 24 条卡牌类型（id 1~24），`type_index` 在 0~5 之间循环，每个 `type_index` 对应 4 种不同 victory 图片。`icon` 路径形如 `/victory_images/victory_01` ~ `/victory_images/victory_24`。

### 5.3 `user_cards` — 用户持有卡牌明细表

| 字段           | 类型              | 说明                                                         |
| -------------- | ----------------- | ------------------------------------------------------------ |
| `id`           | BIGINT UNSIGNED (PK) | 单张卡牌实例主键，自增                                    |
| `user_id`      | BIGINT UNSIGNED   | 用户 ID（关联用户系统主键）                                   |
| `card_type_id` | INT UNSIGNED      | 卡种 ID，外键关联 `card_types.id`                             |
| `source`       | VARCHAR(32)       | 获取来源：`game_drop`（游戏掉落）、`trade`（交易）、`exchange`（兑换） |
| `obtained_time`| DATETIME          | 获取时间（默认 CURRENT_TIMESTAMP）                            |

> **种子数据**：base.sql 预置了 4 条测试数据：用户1 持有 card_type_id 1,2,3；用户2 持有 card_type_id 6。

### 5.4 数据库初始化

**文件**：[sql/base.sql](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/sql/base.sql)

```bash
# 在 MySQL 中执行：
mysql -u root -p < sql/base.sql
# 或先手动创建数据库：
CREATE DATABASE 12happy DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 六、安全机制说明

### 6.1 请求认证流水线

| 阶段 | 组件                     | 职责                                                         |
| ---- | ------------------------ | ------------------------------------------------------------ |
| ①    | `SecurityHeadersFilter`  | 统一注入防御性安全响应头（X-Frame-Options、X-Content-Type-Options 等） |
| ②    | `CorsFilter`             | 白名单跨域校验，仅允许配置的 origin 通过                      |
| ③    | `ApiKeyFilter`           | 校验 `X-Api-Key` 请求头（排除 `/api/images/**`、`/hello`）   |
| ④    | `UserContextInterceptor` | 提取 `X-User-Id` 写入 `UserContext` ThreadLocal              |
| ⑤    | Controller → Service     | Service 层调用 `validateOwnership()` 进行越权校验             |

### 6.2 关键请求头

| 请求头         | 必需性                         | 说明                                   |
| -------------- | ------------------------------ | -------------------------------------- |
| `X-Api-Key`    | 除图片接口外全部必需           | API 认证密钥，与 `app.api-key` 配置匹配 |
| `X-User-Id`    | 强烈建议（兼容无头模式）       | 标识操作用户身份，`UserContextInterceptor` 提取后用于所有权校验 |

### 6.3 所有权校验机制

[UserCardServiceImpl.validateOwnership()](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/service/impl/UserCardServiceImpl.java) 核心逻辑：

```java
// 从 ThreadLocal 读取当前请求的 X-User-Id
Long currentUserId = UserContext.getCurrentUserId();

// 若未携带 X-User-Id（currentUserId=null）→ 向后兼容，放行
// 若携带但值不匹配 → 抛出 IllegalArgumentException("无权操作其他用户的数据") → Controller → 403
```

### 6.4 安全响应头

由 [SecurityHeadersFilter](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/config/SecurityHeadersFilter.java) 统一添加：

| 响应头                                                       | 作用                           |
| ------------------------------------------------------------ | ------------------------------ |
| `X-Frame-Options: DENY`                                      | 防止点击劫持                   |
| `X-Content-Type-Options: nosniff`                            | 禁止 MIME 嗅探                 |
| `X-XSS-Protection: 1; mode=block`                            | 启用浏览器 XSS 过滤            |
| `Referrer-Policy: strict-origin-when-cross-origin`           | 跨域 Referer 限制              |
| `Permissions-Policy: camera=(), microphone=(), geolocation=()` | 禁用不必要的浏览器 API         |

---

## 七、配置与环境变量

**配置文件**：[application.yml](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/resources/application.yml)

### 7.1 环境变量一览

| 环境变量                    | 默认值                                                                                           | 说明                       |
| --------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------- |
| `SERVER_PORT`               | `5022`                                                                                           | 服务端口                   |
| `DB_URL`                    | `jdbc:mysql://localhost:3306/12happy?useUnicode=true&characterEncoding=utf8&...&serverTimezone=GMT+8&allowPublicKeyRetrieval=true` | 数据库连接 URL             |
| `DB_USERNAME`               | `root`                                                                                           | 数据库用户名               |
| `DB_PASSWORD`               | *(空)*                                                                                           | 数据库密码                 |
| `APP_IMAGES_BASE_PATH`      | `../public`                                                                                      | 图片资源根目录（相对路径） |
| `APP_API_KEY`               | `dev-secret-key-change-in-production`                                                            | API 认证密钥               |

### 7.2 多环境 Profile

| Profile      | MyBatis 日志级别                                      | 用途           |
| ------------ | ----------------------------------------------------- | -------------- |
| `default`    | 无日志                                                | 默认配置       |
| `dev`        | `StdOutImpl` — SQL 打印到标准输出                      | 本地开发调试   |
| `production` | `NoLoggingImpl` — 关闭 SQL 日志                       | 生产环境       |

**激活方式**：

```bash
# 开发环境
mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 生产环境（通过环境变量）
export SPRING_PROFILES_ACTIVE=production
java -jar target/*.jar
```

### 7.3 开发环境配置要求

| 软件           | 版本要求        | 说明                          |
| -------------- | --------------- | ----------------------------- |
| JDK            | **21**          | 项目 `java.version` 为 21    |
| MySQL          | **8.0+**        | 使用 `com.mysql.cj.jdbc.Driver` |
| Maven          | 3.9+ (或使用 mvnw 免安装) | 构建与依赖管理         |
| IDE            | 推荐 IntelliJ IDEA | 需安装 Lombok 插件           |

### 7.4 快速启动

```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS 12happy DEFAULT CHARACTER SET utf8mb4;"

# 2. 初始化表结构与种子数据
mysql -u root -p 12happy < sql/base.sql

# 3. 设置环境变量（Windows PowerShell）
$env:DB_PASSWORD="your_password"
$env:APP_API_KEY="your_api_key"

# 4. 启动（使用 Maven Wrapper，无需安装 Maven）
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 5. 验证
curl -H "X-Api-Key: dev-secret-key-change-in-production" http://localhost:5022/hello
```

---

## 八、核心文件用途详解

### 8.1 配置层

| 文件                                                                                                    | 用途                                                                      |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [SecurityHeadersFilter.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/config/SecurityHeadersFilter.java) | `@Order(1)` 最高优先级过滤器，为所有响应统一注入安全头部                 |
| [ApiKeyFilter.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/config/ApiKeyFilter.java) | `@Order(2)` 认证过滤器，恒定时间比较 SHA-256 哈希，防时序攻击            |
| [CorsConfig.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/config/CorsConfig.java) | 跨域白名单配置，默认允许 localhost:5173/4173/8080/8081（Vite 开发服务器端口） |
| [WebMvcConfig.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/config/WebMvcConfig.java) | 注册 `UserContextInterceptor` 到 `/api/**` 路径，排除 `/api/open/**`      |
| [GlobalExceptionHandler.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/config/GlobalExceptionHandler.java) | `@RestControllerAdvice` 全局异常拦截，按异常消息关键字映射 HTTP 状态码    |

### 8.2 上下文与拦截器

| 文件                                                                                                    | 用途                                                                      |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [UserContext.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/context/UserContext.java) | `ThreadLocal<Long>` 绑定当前请求用户 ID，提供 `set/get/clear` 三个静态方法 |
| [UserContextInterceptor.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/interceptor/UserContextInterceptor.java) | `preHandle` 中解析 `X-User-Id` → `UserContext.set()`，`afterCompletion` 中 `UserContext.clear()` |

### 8.3 控制器

| 文件                                                                                                    | 核心职责                                                                      |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [WebController.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/controller/WebController.java) | `/hello` 健康检查端点，无需认证                                                |
| [CardTypeController.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/controller/CardTypeController.java) | 卡牌类型的标准 REST CRUD（增删改查 + 按 isEnable 过滤）                        |
| [UserCardController.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/controller/UserCardController.java) | 用户卡牌 CRUD + 批量删除（图鉴重置）+ 图片兑换（exchange）                      |
| [ImageController.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/controller/ImageController.java) | 静态图片资源服务：victory/tile/decorations/favicon，含 ETag 缓存与安全校验      |

### 8.4 Service 业务层

| 文件                                                                                                    | 核心职责                                                                      |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [CardTypeService.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/service/CardTypeService.java) / [CardTypeServiceImpl.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/service/impl/CardTypeServiceImpl.java) | 卡牌类型的增删改查，操作不存在的记录时抛 `IllegalArgumentException`              |
| [UserCardService.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/service/UserCardService.java) / [UserCardServiceImpl.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/service/impl/UserCardServiceImpl.java) | 用户卡牌 CRUD + 所有权校验 + `@Transactional exchange()` 兑换原子事务            |

### 8.5 Mapper 持久层

| 文件                                                                                                    | 核心 SQL                                                                      |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [CardTypeMapper.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/mapper/CardTypeMapper.java) + [CardTypeMapper.xml](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/resources/mapper/CardTypeMapper.xml) | `selectAll`（动态 where is_enable）、`selectById`、`insert`、`update`（动态 set）、`deleteById` |
| [UserCardMapper.java](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/java/com/qingquan/mapper/UserCardMapper.java) + [UserCardMapper.xml](file:///d:/Users/lenovo/Desktop/开心消消乐的计划文档/12happy/12happy-backend-main/src/main/resources/mapper/UserCardMapper.xml) | CRUD + `deleteByUserId`（图鉴重置）+ `selectByUserIdAndCardTypeId`（兑换取 4 张）+ `deleteByIds`（批量删除） |

---

## 九、前后端对接要点

### 9.1 前端必须携带的请求头

```javascript
// 所有 /api/** 请求（除 /api/images/** 外）需要带这两个头：
fetch('/api/card-types', {
  headers: {
    'X-Api-Key': 'your-api-key',       // API 认证
    'X-User-Id': '1',                   // 当前用户 ID
    'Content-Type': 'application/json'
  }
});
```

### 9.2 游戏掉落卡牌流程

```
用户通关 → 前端 POST /api/user-cards
{
  "userId": 1,           // 与 X-User-Id 一致
  "cardTypeId": 5,       // 掉落的卡牌类型
  "source": "game_drop"  // 标识来源
}
→ 后端写入 user_cards 表 → 返回 Result<Void>
```

### 9.3 图片兑换流程

```
用户集齐 4 张同类型卡牌 → 前端 POST /api/user-cards/exchange
{
  "userId": 1,
  "sourceCardTypeId": 3,    // 消耗的卡牌类型
  "targetCardTypeId": 7     // 获得的新卡牌类型
}
→ 后端事务性 4 换 1 → 返回 Result<UserCard>（含新卡牌信息）
```

### 9.4 图鉴查询流程

```
前端 GET /api/user-cards/user/{userId}
→ 返回该用户持有的所有卡牌列表（含 cardTypeId、source、obtainedTime）
→ 前端根据 cardTypeId 对照 card_types 表展示对应的 victory 图片

前端 GET /api/images/victory/{cardTypeId}
→ 获取对应 cardTypeId 的胜利图片文件（带缓存头）
```

### 9.5 图鉴重置流程

```
前端 DELETE /api/user-cards/user/{userId}/all
→ 删除该用户所有 user_cards 记录 → 返回 Result<Integer>（被删除的记录数）
```

### 9.6 错误处理

前端应统一处理 `Result.code`：

```javascript
if (response.code === 200) { /* 成功 */ }
else if (response.code === 400) { /* 参数错误，显示 response.msg */ }
else if (response.code === 401) { /* 未授权，检查 X-Api-Key */ }
else if (response.code === 403) { /* 越权，检查 X-User-Id */ }
else if (response.code === 404) { /* 资源不存在 */ }
else { /* 服务器错误 */ }
```

---

## 十、图片资源说明

### 10.1 图片目录结构与对应 API

| 类型       | 文件系统路径                       | API 路径示例                              | 说明                          |
| ---------- | --------------------------------- | ----------------------------------------- | ----------------------------- |
| 胜利图     | `images/victory_images/victory_*.png` | `GET /api/images/victory/{id}`        | 24 张胜利图 (victory_01~24.png) |
| 砖块图标   | `images/custom-icons/tile*.png`   | `GET /api/images/tile/{index}`            | 6 张游戏砖块 (tile01~06.png)  |
| 装饰图     | `images/decorations/*.png`        | `GET /api/images/decorations/{name}`      | 左装饰图 decoration-left.png  |
| Favicon    | `images/favicon.svg`              | `GET /api/images/favicon.svg`             | 网站 SVG 图标                 |

### 10.2 图片缓存策略

所有图片接口返回：
- **ETag**：文件内容 MD5 哈希（支持 304 Not Modified）
- **Last-Modified**：文件系统修改时间
- **Cache-Control**：`public, max-age=3600, must-revalidate`（浏览器缓存 1 小时）

---

## 十一、扩展与维护建议

| 场景                       | 修改位置                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| 新增/修改 API 端点         | 新增 Controller → 新增 Service 方法 → 新增 Mapper 方法 + XML SQL                           |
| 修改数据库表结构           | 修改 `sql/base.sql`（生产环境需编写 flyway/liquibase 迁移脚本）                             |
| 新增卡牌类型               | POST `/api/card-types` 接口，或直接 INSERT 到 `card_types` 表                              |
| 更换认证方式               | 修改 `ApiKeyFilter` 或替换为 Spring Security                                                |
| 切换 JWT/OAuth 用户认证    | 修改 `UserContextInterceptor`，从 JWT token 解析 userId 写入 `UserContext`                 |
| 增加兑换消耗数量           | 修改 `UserCardServiceImpl.exchange()` 中的 LIMIT 4 和数量校验逻辑                          |
| 生产环境部署               | 设置环境变量 `SPRING_PROFILES_ACTIVE=production` + `APP_API_KEY` 使用强密钥                 |

---

> **文档版本**：v1.0 · **最后更新**：2026-06-01 · **维护者**：后端开发团队
