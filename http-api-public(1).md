# 招标管理 HTTP API

## 资源模型

| 前端概念 | 标识符 | 生成方 | 落点 |
| --- | --- | --- | --- |
| 上传文件 | `"file-" + UUID` | HTTP 上传层 | `{raw}/blobs/{fileId}` + SQLite `uploaded_files` |
| 招标公告 | `"ann-" + UUID` | HTTP 创建层 | SQLite `announcements` + `announcement_files` |
| 招标公告详情 | 与公告 id 相同（1:1） | 随公告创建自动初始化 | SQLite `announcement_details`（随公告级联删除） |
| 子标包 | `"sublot-" + UUID` | HTTP 子标包接口 | SQLite `sub_lot_details`（随公告详情级联删除） |
| 清理任务 | `"job-" + UUID` | 现有 `JobWorkspace`（不改生成规则） | 进程内 `JobTracker` + SQLite `clean_jobs` 终态；输出在 `{processed}/job-.../` |
| 企业产品 | `"product-" + UUID` | HTTP 产品接口 | SQLite `products` |
| 匹配结果 | 与公告 id 相同（每公告至多一行） | 匹配服务（提取成功后自动或手动触发） | SQLite `match_results`（随公告级联删除） |

同一上传文件可挂到多个公告；blob 为共享存储。删除公告不删仍被其他公告引用、或已卸下但仍存在的 blob。


## 通用约定

- 所有 JSON 请求/响应体均为 UTF-8。
- 时间一律 ISO-8601 UTC（例如 `2026-08-14T10:00:00Z`）。
- 前端可见的相对路径一律 `/` 分隔。不要发送反斜杠或操作系统原生路径。
- 响应**不**向前端返回上传 blob 或物化树的服务器绝对路径。`GET /jobs/{jobId}` 终态中的 `manifestPath` / `reviewPath` / `mergedPath`（以及可选的 `jobDirectory`）为本机调试字段，前端请勿依赖。
- 上传上限 **100 MiB**。超限 `413 UPLOAD_TOO_LARGE`。
- 错误响应格式：

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Uploaded file does not exist"
  }
}
```

| HTTP 状态码 | 含义 |
|---|---|
| 200 | 成功（查询、挂接/卸下后返回公告） |
| 201 | 创建成功（上传文件、创建公告、创建子标包、创建产品） |
| 202 | 任务已接受（clean/resume 提交成功、元数据提取或产品匹配已受理） |
| 204 | 删除成功，无响应体 |
| 400 | 请求参数无效 |
| 403 | 功能被配置禁用（`EXTRACTION_DISABLED` / `MATCHING_DISABLED`） |
| 404 | 资源不存在，或 `jobId` 不属于本进程注册表 |
| 405 | HTTP 方法不支持 |
| 409 | 冲突（路径占用、文件仍被引用、公告任务运行中等） |
| 413 | 上传超过 100 MiB |
| 500 | 服务器内部错误（含接受超时、首事件前失败等） |
| 503 | 任务上限已满（`JOB_QUEUE_FULL`）或服务器正在关闭（`SERVER_SHUTTING_DOWN`） |

### CORS 与绑定

- 只绑定回环，无认证、无 TLS。
- 允许本机前端：`Access-Control-Allow-Origin` 反射 `http://127.0.0.1:*` 与 `http://localhost:*`。
- 允许方法：`GET, POST, PUT, DELETE, OPTIONS`；允许请求头：`Content-Type`。

## 端点

### GET /api/v1/health

健康检查。

**响应 200：**

```json
{
  "status": "UP",
  "docling": {
    "status": "UP",
    "version": "v1.26.0",
    "baseUrl": "http://127.0.0.1:5001"
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `status` | string | `UP`（Docling 正常）或 `DEGRADED`（Docling 不可用） |
| `docling.status` | string | `UP` 或 `DOWN` |
| `docling.version` | string? | Docling 运行时版本，不可用时为 null |
| `docling.baseUrl` | string? | Docling 服务地址，不可用时为 null |

### GET /api/v1/version

版本信息。

**响应 200：**

```json
{
  "application": "TenderCleaner 1.0-SNAPSHOT",
  "java": "25.0.1",
  "designBaseline": "1",
  "docling": "v1.26.0"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `application` | string | 应用版本 |
| `java` | string | Java 运行时版本 |
| `designBaseline` | string | 设计基线版本 |
| `docling` | string? | Docling 运行时版本，不可用时为 null |

### POST /api/v1/files

`multipart/form-data` 上传，字段名必须为 `file`。不校验扩展名。不返回服务器落盘绝对路径。

**响应 201：**

```json
{
  "fileId": "file-3f2c1a6e-8b21-4c0d-9e44-1a2b3c4d5e6f",
  "originalName": "招标公告.pdf",
  "sizeBytes": 1048576,
  "createdAt": "2026-08-14T10:00:00Z"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `fileId` | string | `"file-" + UUID` |
| `originalName` | string | 客户端文件名，仅用于展示 |
| `sizeBytes` | number | 字节数 |
| `createdAt` | string | 上传时间（UTC） |

**错误 400：** 缺 `file` 字段或空文件（`INVALID_REQUEST`）。

**错误 413：** 超过 100 MiB（`UPLOAD_TOO_LARGE`）。

### GET /api/v1/files

已上传文件列表，按 `createdAt` 降序、`fileId` 降序。默认分页。不展开挂接明细，不返回绝对路径。

| 查询参数 | 默认 | 约束 |
|---|---|---|
| `page` | `1` | 从 1 起的十进制整数 |
| `size` | `20` | 十进制整数，`1`–`100` |

省略参数等于默认值，**不再返回全量**。`page` 超出最后一页时仍为 `200`，`files` 为空，`total` 仍为库中总行数。

**响应 200：**

```json
{
  "files": [
    {
      "fileId": "file-3f2c1a6e-8b21-4c0d-9e44-1a2b3c4d5e6f",
      "originalName": "招标公告.pdf",
      "sizeBytes": 1048576,
      "createdAt": "2026-08-14T10:00:00Z",
      "attachmentCount": 1
    }
  ],
  "page": 1,
  "size": 20,
  "total": 1
}
```

`attachmentCount` 为该文件当前挂接的公告数。`total` 为满足排序的总行数，不是本页条数。

**错误 400：** `page`/`size` 缺省以外的空串、非十进制整数、`page < 1`、`size < 1` 或 `size > 100`（`INVALID_REQUEST`）。

### GET /api/v1/files/{fileId}

上传文件详情，含挂接公告。

**响应 200：**

```json
{
  "fileId": "file-3f2c1a6e-8b21-4c0d-9e44-1a2b3c4d5e6f",
  "originalName": "招标公告.pdf",
  "sizeBytes": 1048576,
  "createdAt": "2026-08-14T10:00:00Z",
  "attachmentCount": 1,
  "attachments": [
    {
      "announcementId": "ann-7c1e...",
      "announcementName": "某电缆储检一体化库项目招标公告",
      "relativePath": "招标文件/公告.pdf"
    }
  ]
}
```

**错误 404：** 未知 `fileId`（`FILE_NOT_FOUND`）。

### GET /api/v1/files/{fileId}/content

下载原始上传 blob。响应体为文件字节，不是 JSON。不返回服务器绝对路径。

**响应 200：**

| 响应头 | 值 |
|---|---|
| `Content-Type` | 按 `originalName` 扩展名：`.pdf` → `application/pdf`；`.docx` → `application/vnd.openxmlformats-officedocument.wordprocessingml.document`；`.xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`；`.txt` → `text/plain; charset=utf-8`；`.md` → `text/markdown; charset=utf-8`；`.png` → `image/png`；`.jpg`/`.jpeg` → `image/jpeg`；其余或无扩展名 → `application/octet-stream` |
| `Content-Length` | `sizeBytes` |
| `Content-Disposition` | `attachment`；`filename` 为 ASCII 回退名；`filename*` 为 `UTF-8''` + percent-encoded 展示名（RFC 5987）。展示名取 `originalName` 的最后路径段；空则 `download` |

**错误 404：** 未知 `fileId`，或元数据存在但 blob 缺失（`FILE_NOT_FOUND`）。

### DELETE /api/v1/files/{fileId}

删除未挂接的上传文件与 blob。仅当 `attachmentCount == 0`。不提供级联卸下后再删。无响应体。

**响应 204。**

**错误 404：** 未知 `fileId`（`FILE_NOT_FOUND`）。

**错误 409：** 仍被任一公告挂接（`FILE_IN_USE`）；blob 与库行保留。

### POST /api/v1/products

创建企业产品（匹配输入：名称/关键字/简介）。`name` 全表唯一（大小写敏感）；请求体只允许 `name` / `keywords` / `description` 三个键，未知键 `400`。

**请求：**

```json
{
  "name": "烟感探测器",
  "keywords": ["烟感", "火灾报警"],
  "description": "点型光电感烟火灾探测器，含底座与蜂鸣器"
}
```

字段规则：`name` 去空白后非空、≤ 100 字符；`keywords` ≤ 50 个、每个去空白后非空且 ≤ 50 字符、按值去重保持顺序、可为 `[]`；`description` 去空白后非空、≤ 2000 字符。

**响应 201：**

```json
{
  "id": "product-9d3a...",
  "name": "烟感探测器",
  "keywords": ["烟感", "火灾报警"],
  "description": "点型光电感烟火灾探测器，含底座与蜂鸣器",
  "createdAt": "2026-09-03T02:00:00Z",
  "updatedAt": "2026-09-03T02:00:00Z"
}
```

**错误 400：** 字段非法或含未知键（`INVALID_REQUEST`）。

**错误 409：** 产品名冲突（`PRODUCT_NAME_CONFLICT`）。

### GET /api/v1/products

产品列表（不分页全量，按 `createdAt, id` 稳定升序）。

**响应 200：** 数组，元素形状同创建响应。

### GET /api/v1/products/{productId}

单个产品。

**响应 200：** 形状同创建响应。

**错误 404：** 未知产品（`PRODUCT_NOT_FOUND`）。

### PUT /api/v1/products/{productId}

全量替换 `name` / `keywords` / `description`（规则同创建）；`id` 与 `createdAt` 不变，`updatedAt` 更新。

**响应 200：** 形状同创建响应。

**错误 400：** 字段非法或含未知键（`INVALID_REQUEST`）。

**错误 404：** 未知产品（`PRODUCT_NOT_FOUND`）。

**错误 409：** 改名后与其他产品重名（`PRODUCT_NAME_CONFLICT`）。

### DELETE /api/v1/products/{productId}

删除产品。不影响既有匹配结果（结果存名称快照，见匹配端点小节）。

**响应 204。** 无响应体。

**错误 404：** 未知产品（`PRODUCT_NOT_FOUND`）。

### POST /api/v1/announcements

创建招标公告，并自动创建其详情（detail）（数组字段为 `[]`，`deadline` / `projectCode` 为 `null`）。

**请求：**

```json
{ "name": "某电缆储检一体化库项目招标公告" }
```

`name` 会 trim；空名 → `400 INVALID_REQUEST`。

**响应 201：**

```json
{
  "id": "ann-7c1e...",
  "name": "某电缆储检一体化库项目招标公告",
  "lastModifiedTime": "2026-08-14T10:01:00Z",
  "files": [],
  "lastGeneratedCleanedAnnouncementTime": null,
  "lastJobId": null,
  "lastExtractionStatus": null,
  "lastExtractedAt": null,
  "lastExtractionError": null,
  "lastMatchStatus": null,
  "lastMatchedAt": null,
  "lastMatchError": null,
  "detail": {
    "id": "ann-7c1e...",
    "tenderers": [],
    "agents": [],
    "deadline": null,
    "projectCode": null,
    "qualifications": [],
    "subLotIds": []
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | `"ann-" + UUID` |
| `name` | string | 公告名称 |
| `lastModifiedTime` | string | 创建、合并更新、挂接、卸下时更新 |
| `files` | array | 创建时为空 |
| `lastGeneratedCleanedAnnouncementTime` | string? | 最近一次成功生成清理公告的时间；初值为 null |
| `lastJobId` | string? | 最近一次被接受的 clean/resume；从未提交过为 null |
| `lastExtractionStatus` | string? | 最近一次元数据提取状态：`RUNNING` / `SUCCESS` / `FAILED`；从未提取为 null |
| `lastExtractedAt` | string? | 最近一次提取成功时间；失败与进行中不写该字段，初值为 null |
| `lastExtractionError` | string? | 失败摘要；`RUNNING`/`SUCCESS` 时为 null |
| `lastMatchStatus` | string? | 最近一次产品匹配状态：`RUNNING` / `SUCCESS` / `FAILED`；从未匹配为 null |
| `lastMatchedAt` | string? | 最近一次匹配成功时间；失败与进行中不写该字段，初值为 null |
| `lastMatchError` | string? | 失败摘要；`RUNNING`/`SUCCESS` 时为 null |
| `detail` | object | 内嵌的 1:1 公告详情；形状见 GET 单公告 |

`detail` 内可空字段（`deadline` / `projectCode`）始终显式返回 `null`（不省略键）。提取状态三字段在所有同形公告响应（创建、GET 单公告、列表、PUT、挂接/卸下、搜索结果）中同样始终显式返回；匹配状态三字段以同样方式在同形响应中始终显式返回，语义见手动匹配端点小节。

### GET /api/v1/announcements

公告列表（前端首页）。列表项带 `fileCount`，不展开全部文件。按 `lastModifiedTime` 降序。

**响应 200：**

```json
{
  "announcements": [
    {
      "id": "ann-7c1e...",
      "name": "某电缆储检一体化库项目招标公告",
      "lastModifiedTime": "2026-08-14T10:05:00Z",
      "fileCount": 3,
      "lastGeneratedCleanedAnnouncementTime": "2026-08-14T11:00:00Z",
      "lastJobId": "job-e071e952-d3b7-4be1-8e02-5324214e3cb5",
      "lastExtractionStatus": "SUCCESS",
      "lastExtractedAt": "2026-08-14T11:00:03Z",
      "lastExtractionError": null,
      "lastMatchStatus": null,
      "lastMatchedAt": null,
      "lastMatchError": null
    }
  ]
}
```

`lastJobId` 与 `lastGeneratedCleanedAnnouncementTime` 均为 `string?`；从未提交过任务时为 `null`。`lastExtractionStatus` / `lastExtractedAt` / `lastExtractionError` 均为 `string?`，语义见手动提取端点小节；从未提取过均为 `null`。`lastMatchStatus` / `lastMatchedAt` / `lastMatchError` 均为 `string?`，语义见手动匹配端点小节；从未匹配过均为 `null`。

### GET /api/v1/announcements/search

公告关键字搜索（只读）。`keywords` 按空白切分为多个关键词（OR 语义：任一可搜索字段命中任一关键词即归入结果），可叠加两组相互独立的日期范围，返回按公告归类的命中结果。结果排序同公告列表：`lastModifiedTime` 降序，同刻按 `id` 降序。

**查询参数：**

| 查询参数 | 必填 | 约定 |
|---|---|---|
| `keywords` | 是 | 按空白切分（含全角空格、NBSP、Tab、换行等），丢弃空段后至少 1 个关键词；最多 20 个、每个不超过 100 字符；重复关键词去重（保留首次出现顺序） |
| `deadlineFrom` / `deadlineTo` | 否 | 严格 `uuuu-MM-dd`（`ResolverStyle.STRICT`）；作用于投标截止日期（`detail.deadline`），闭区间；设定任一边界时，未填写截止日期的公告被排除 |
| `modifiedFrom` / `modifiedTo` | 否 | 严格 `uuuu-MM-dd`（`ResolverStyle.STRICT`，UTC 日）：`modifiedFrom` 含当天 `00:00:00.000Z` 起，`modifiedTo` 含当天全天；作用于 `lastModifiedTime` |
| `page` / `size` | 否 | 同文件列表分页：`page` 默认 `1`、从 1 起、不设上限（越界页返回 `200` 空列表）；`size` 默认 `20`，`1`–`100` |

两组日期范围相互独立，可同时给定（叠加为 AND）；全部省略 = 不限日期。

**可搜索字段与 path 语法：**

path 把公告的三部分存储映射为同一公告实体：字段段以 `.` 连接；普通字符串数组元素以 `[索引]`（0 起）表示；`subLots` 数组元素以 `[子标包id]` 表示（不使用索引，子标包增删/重排后 path 仍稳定）。

| 外部 path | 命中粒度 |
|---|---|
| `name` | 公告名称整值 |
| `detail.projectCode` | 项目编号整值 |
| `detail.tenderers[i]` | 招标机构第 i 个元素 |
| `detail.agents[i]` | 代理机构第 i 个元素 |
| `detail.qualifications[i]` | 通用资格第 i 个元素 |
| `subLots[{id}].name` | 子标包名称整值 |
| `subLots[{id}].estimatedAmountNote` | 预估金额说明整值 |
| `subLots[{id}].maxPriceNote` | 最高限价说明整值 |
| `subLots[{id}].depositNote` | 保证金说明整值 |
| `subLots[{id}].qualifications[i]` | 子标包资格第 i 个元素 |

不参与关键词匹配：全部结构性 id 字段（公告/详情/子标包 id 与 `detail.subLotIds`）、日期时间字段（由日期范围参数负责过滤）、金额整数字段。`lastJobId` 属 id 类字段，不参与匹配，仅随结果基本信息返回。`lastJobDirectory` 为服务器内部绝对路径，既不参与匹配，也绝不出现在任何响应中。

**响应 200：**

```json
{
  "results": [
    {
      "id": "ann-7c1e...",
      "name": "某电缆储检一体化库项目招标公告",
      "lastModifiedTime": "2026-08-14T10:05:00Z",
      "lastGeneratedCleanedAnnouncementTime": null,
      "lastJobId": null,
      "lastExtractionStatus": null,
      "lastExtractedAt": null,
      "lastExtractionError": null,
      "lastMatchStatus": null,
      "lastMatchedAt": null,
      "lastMatchError": null,
      "hits": {
        "name": { "value": "某电缆储检一体化库项目招标公告", "matchedKeywords": ["电缆"] },
        "detail.tenderers[0]": { "value": "某市电缆产业投资集团", "matchedKeywords": ["电缆", "集团"] },
        "subLots[sublot-9f2a...].qualifications[1]": { "value": "具备电缆生产相关资质", "matchedKeywords": ["资质"] }
      }
    }
  ],
  "page": 1,
  "size": 20,
  "total": 1
}
```

- `results` 元素的基本信息只含公告字段（`id` / `name` / `lastModifiedTime` / `lastGeneratedCleanedAnnouncementTime` / `lastJobId` / `lastExtractionStatus` / `lastExtractedAt` / `lastExtractionError` / `lastMatchStatus` / `lastMatchedAt` / `lastMatchError`），可空字段始终显式返回 `null`；不含 `fileCount` 与文件明细。提取状态与匹配状态字段不参与关键词匹配。
- `hits` 键为上述 path，值为该字段完整值 `value` 与命中它的原始关键词列表 `matchedKeywords`（按请求中出现顺序、去重）。键的顺序固定：`name` → `detail.projectCode` → `detail.tenderers` → `detail.agents` → `detail.qualifications` → `subLots`（按 `subLotIds` 展示顺序）。
- `page` / `size` / `total` 语义同文件分页：`total` 为命中公告总数；越界页返回 `200` 空 `results`。

**错误 400（`INVALID_REQUEST`）：** `keywords` 缺失/全空白/切分后无有效关键词/超过 20 个或单个超过 100 字符；任一日期非法或 `from > to`；`page`/`size` 为非十进制整数/空串/`page < 1`/`size` 越界。

**错误 500（`INTERNAL_ERROR`）：** 内部错误；`message` 固定为 `Internal server error`。

### GET /api/v1/announcements/{announcementId}

公告详情，含扁平 `files` 与内嵌的 1:1 公告详情 `detail`。

**响应 200：**

```json
{
  "id": "ann-7c1e...",
  "name": "...",
  "lastModifiedTime": "2026-08-14T10:05:00Z",
  "lastGeneratedCleanedAnnouncementTime": "2026-08-14T11:00:00Z",
  "lastJobId": "job-e071e952-d3b7-4be1-8e02-5324214e3cb5",
  "lastExtractionStatus": "SUCCESS",
  "lastExtractedAt": "2026-08-14T11:00:03Z",
  "lastExtractionError": null,
  "lastMatchStatus": "SUCCESS",
  "lastMatchedAt": "2026-08-14T11:00:08Z",
  "lastMatchError": null,
  "files": [
    {
      "fileId": "file-3f2c...",
      "relativePath": "招标文件/公告.pdf",
      "originalName": "招标公告.pdf",
      "sizeBytes": 1048576
    }
  ],
  "detail": {
    "id": "ann-7c1e...",
    "tenderers": ["某市城市建设投资集团"],
    "agents": ["某招标代理有限公司"],
    "deadline": "2026-09-30",
    "projectCode": "ZC-2026-001",
    "qualifications": ["具备独立承担民事责任的能力"],
    "subLotIds": ["sublot-9f2a..."]
  }
}
```

`detail` 字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 与公告 id 相同 |
| `tenderers` | array | 招标机构字符串数组，可为 `[]` |
| `agents` | array | 代理机构字符串数组 |
| `deadline` | string? | 截止日期 `yyyy-MM-dd`；未填写为 `null`（始终显式返回，不省略键） |
| `projectCode` | string? | 客户自定义项目编号；未填写为 `null` |
| `qualifications` | array | 通用限制性资格字符串数组 |
| `subLotIds` | array | 子标包 id 数组；顺序即子标包展示顺序 |

`lastJobId` 为 `string?`：最近一次被接受的 clean/resume；从未提交过为 `null`（字段始终出现，值为 `null` 或 job id，不省略键）。

`lastExtractionStatus` / `lastExtractedAt` / `lastExtractionError` 为 `string?`：最近一次元数据提取的状态 / 成功时间 / 失败摘要；从未提取均为 `null`，`lastExtractedAt` 仅 SUCCESS 写入（语义见手动提取端点小节）。

`lastMatchStatus` / `lastMatchedAt` / `lastMatchError` 为 `string?`：最近一次产品匹配的状态 / 成功时间 / 失败摘要；从未匹配均为 `null`，`lastMatchedAt` 仅 SUCCESS 写入（语义见手动匹配端点小节）。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

### PUT /api/v1/announcements/{announcementId}

合并更新：全量替换公告基本信息（`name`）与内嵌详情，原子完成；成功时更新 `lastModifiedTime`。带 body 的路由统一先做 body 语法与字段校验，后做资源存在性检查（即"公告不存在 + 非法 body"返回 400）。

**请求：**

```json
{
  "name": "某电缆储检一体化库项目招标公告（变更）",
  "detail": {
    "tenderers": ["某市城市建设投资集团"],
    "agents": ["某招标代理有限公司"],
    "deadline": "2026-09-30",
    "projectCode": "ZC-2026-001",
    "qualifications": ["具备独立承担民事责任的能力"],
    "subLotIds": ["sublot-9f2a..."]
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 必填。公告名称，非空白，trim 后存储 |
| `detail` | object | 必填。详情全量替换体 |
| `detail.tenderers` | array | 必填。字符串数组，可为 `[]`；元素必须为文本且非空白，trim 后存储 |
| `detail.agents` | array | 必填。规则同上 |
| `detail.deadline` | string? | 缺失或 `null` → 置空；否则必须为文本且为严格 ISO 日期（`2026-02-30` 等非法日期 400；闰年日期如 `2028-02-29` 合法） |
| `detail.projectCode` | string? | 缺失或 `null` → 置空；否则必须为文本且非空白，trim 后存储 |
| `detail.qualifications` | array | 必填。规则同 `detail.tenderers` |
| `detail.subLotIds` | array | 必填。仅允许对现存子标包**重排**——长度相等、无重复元素、元素集合与现存子标包一致三者同时满足才接受，否则 `409 SUB_LOT_IDS_MISMATCH`；不允许通过本端点新增/删除子标包 |

请求体为空字节、JSON 字面量 `null`、JSON 解析失败均为 `400 INVALID_REQUEST`；文本字段为数字/布尔等非文本类型时同样 400（服务端逐字段按 JSON 类型严格校验，不做标量强制转换）。

**响应 200：** 更新后的公告，形状同 `GET .../{announcementId}`。

**错误 400：** body 非法或字段校验失败（`INVALID_REQUEST`）。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

**错误 409：** `detail.subLotIds` 非纯重排（`SUB_LOT_IDS_MISMATCH`）。

### DELETE /api/v1/announcements/{announcementId}

删除整条招标公告。无响应体。该公告若有运行中 clean/resume → `409 ANNOUNCEMENT_JOB_RUNNING`（先等终态，本阶段不取消任务）。否则：

1. 删除 `announcement_files` 行（不删被其他公告引用的 blob）。
2. 删除该公告的 `clean_jobs` 终态行。
3. 删除 `announcements` 行。
4. 删除物化树 `{raw}/trees/{announcementId}/`（若存在）。
5. **不**删除 `processed_tender_file_dir/job-*` 工作区（历史清洗产物本阶段不回收）。
6. **不**删除仍被其他公告挂接、或已卸下但仍存在的上传 blob。

**响应 204。**

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

**错误 409：** 该公告有运行中任务（`ANNOUNCEMENT_JOB_RUNNING`）。

删除公告同时经外键级联删除其 `announcement_details` 行与全部 `sub_lot_details` 行，无需额外调用。

### POST /api/v1/announcements/{announcementId}/sub-lots

创建子标包。公告详情随公告创建已自动存在；创建后子标包 id 追加到详情 `subLotIds` 末尾（同事务原子完成）。

**请求：**

```json
{
  "name": "第一标段：电缆采购",
  "estimatedAmount": 125000000,
  "estimatedAmountNote": "含税预估",
  "maxPrice": 130000000,
  "maxPriceNote": null,
  "deposit": 2000000,
  "qualifications": ["具备电缆生产许可证"]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 必填。子标包名称，非空白，trim 后存储 |
| `estimatedAmount` | number? | 预估金额，人民币分。缺失或 `null` 表示未填；否则必须为 JSON 整型数字且 `>= 0`、不超出 64 位整数范围。字符串数字（`"10"`）、浮点（`1.5`、`1e2`）、负数、超范围均 400 |
| `estimatedAmountNote` | string? | 预估金额额外说明。缺失或 `null` 表示无；非 `null` 时必须为文本，trim 后存储，纯空白 400 |
| `maxPrice` | number? | 最高限价，人民币分。校验规则同 `estimatedAmount` |
| `maxPriceNote` | string? | 最高限价额外说明，规则同 `estimatedAmountNote` |
| `deposit` | number? | 保证金，人民币分。校验规则同 `estimatedAmount` |
| `depositNote` | string? | 保证金额外说明，规则同 `estimatedAmountNote` |
| `qualifications` | array | 必填。专用限制性资格字符串数组，可为 `[]`；元素必须为文本且非空白，trim 后存储 |

请求体不含 `id` / `announcementId` 身份字段。

**响应 201：**

```json
{
  "id": "sublot-9f2a...",
  "announcementId": "ann-7c1e...",
  "name": "第一标段：电缆采购",
  "estimatedAmount": 125000000,
  "estimatedAmountNote": "含税预估",
  "maxPrice": 130000000,
  "maxPriceNote": null,
  "deposit": 2000000,
  "depositNote": null,
  "qualifications": ["具备电缆生产许可证"]
}
```

可空金额/说明字段始终显式返回 `null`（不省略键）。

**错误 400：** body 非法或字段校验失败（`INVALID_REQUEST`）。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

### GET /api/v1/announcements/{announcementId}/sub-lots

子标包列表，按详情 `subLotIds` 顺序返回。

**响应 200：**

```json
{
  "subLots": [
    {
      "id": "sublot-9f2a...",
      "announcementId": "ann-7c1e...",
      "name": "第一标段：电缆采购",
      "estimatedAmount": 125000000,
      "estimatedAmountNote": "含税预估",
      "maxPrice": 130000000,
      "maxPriceNote": null,
      "deposit": 2000000,
      "depositNote": null,
      "qualifications": ["具备电缆生产许可证"]
    }
  ]
}
```

无子标包时返回 `{ "subLots": [] }`。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

### GET /api/v1/announcements/{announcementId}/sub-lots/{subLotId}

单条子标包详情。

**响应 200：** 形状同创建响应。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）；子标包不存在或不属于该公告（`SUB_LOT_NOT_FOUND`）。

### PUT /api/v1/announcements/{announcementId}/sub-lots/{subLotId}

全量更新子标包可变字段（`name`、金额/说明、`qualifications`）。身份由路径参数确定，请求体不含 `id` / `announcementId`，子标包不可移动到另一公告。

**响应 200：** 更新后的子标包，形状同创建响应。

**错误 400：** body 非法或字段校验失败（`INVALID_REQUEST`）。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）；子标包不存在或不属于该公告（`SUB_LOT_NOT_FOUND`）。

### DELETE /api/v1/announcements/{announcementId}/sub-lots/{subLotId}

删除子标包，并同步从详情 `subLotIds` 移除（同事务原子完成）。无响应体。

**响应 204。**

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）；子标包不存在或不属于该公告（`SUB_LOT_NOT_FOUND`）。

子标包 CRUD **不更新**公告的 `lastModifiedTime`（该字段仅反映公告本身、合并更新与文件挂接变化）。

### POST /api/v1/announcements/{announcementId}/files

将已上传文件按指定相对路径挂到公告上。成功返回更新后的公告（形状同 `GET .../{id}`，含内嵌 `detail`）。

**请求：**

```json
{
  "fileId": "file-3f2c...",
  "relativePath": "招标文件/公告.pdf"
}
```

同一公告内 `relativePath` 唯一；同一 `fileId` 在同一公告内也只允许挂一次。新路径不得是已有路径的前缀，已有路径也不得是新路径的前缀（避免「一段既是文件又是目录」）。挂接成功后更新 `lastModifiedTime`。

**错误 400：** JSON 非法、相对路径非法（`INVALID_REQUEST`）。见 [relativePath 校验](#relativepath-校验)。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）或未知文件（`FILE_NOT_FOUND`）。

**错误 409：** 相对路径已占用或与已有路径互为前缀（`RELATIVE_PATH_CONFLICT`）；同公告已挂接该 `fileId`（`FILE_ALREADY_ATTACHED`）。

### DELETE /api/v1/announcements/{announcementId}/files/{fileId}

从该公告卸下挂接，返回更新后的公告（形状同挂接响应，含内嵌 `detail`）。不删除共享 blob 与 `uploaded_files` 行。更新 `lastModifiedTime`。卸下后目录树以挂接表为准重建，不扫磁盘。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）；该公告未挂接该 `fileId`（`FILE_NOT_ATTACHED`）。

### GET /api/v1/announcements/{announcementId}/tree

以目录树返回指定公告下的文件。树的唯一真相是 SQLite 挂接表，不扫磁盘。目录节点与同级文件均按 `name` 字典序。

**响应 200：**

```json
{
  "announcementId": "ann-7c1e...",
  "root": {
    "name": "",
    "type": "directory",
    "children": [
      {
        "name": "招标文件",
        "type": "directory",
        "children": [
          {
            "name": "公告.pdf",
            "type": "file",
            "fileId": "file-3f2c...",
            "originalName": "招标公告.pdf",
            "sizeBytes": 1048576
          }
        ]
      }
    ]
  }
}
```

空公告：`root.children` 为空数组。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

**错误 500：** 挂接表出现「一段既是文件又是目录」的损坏数据（`INVALID_TREE`）。正常挂接校验应已禁止此情况。

### POST /api/v1/announcements/{announcementId}/clean

基于公告文件树创建异步清理任务。服务端先把挂接物化到 `{raw}/trees/{announcementId}/`（每次先清空再复制 blob，不改原件），再调用 `CleanRequest.forDirectory(treeDir, processedTenderDir, announcement.name)`。

请求体可为空对象 `{}`。

**响应 202：**

```json
{
  "jobId": "job-e071e952-d3b7-4be1-8e02-5324214e3cb5",
  "announcementId": "ann-7c1e...",
  "status": "RUNNING",
  "accepted": true,
  "statusUrl": "/api/v1/jobs/job-e071e952-d3b7-4be1-8e02-5324214e3cb5"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `jobId` | string | `"job-" + UUID`，与工作区目录名相同 |
| `announcementId` | string | 关联公告 |
| `status` | string | 接受时多为 `RUNNING`；极短窗口内可为 `CREATED` |
| `accepted` | boolean | 恒为 `true` |
| `statusUrl` | string | `/api/v1/jobs/{jobId}`，可由 `jobId` 独立构造 |

**不返回** `jobDirectory`。

任务成功接受后更新公告的 `lastJobId`。仅当终态为 `COMPLETED` 或 `COMPLETED_WITH_ERRORS` 时写入 `lastGeneratedCleanedAnnouncementTime`；`FAILED` 不改该字段。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

**错误 409：** 无文件（`ANNOUNCEMENT_EMPTY`）；该公告已有运行中任务（`ANNOUNCEMENT_JOB_RUNNING`）。

**错误 500 / 503：** 与阶段 9 相同的接受失败 / 队列满 / 关闭中语义。物化失败（缺 blob）不返回 202。

### POST /api/v1/announcements/{announcementId}/resume

异步恢复该公告最近一次清理任务。

**请求：**

```json
{ "force": false }
```

`force` 缺省为 `false`。

**响应 202：** 形状与 clean 相同。`jobId` 仍是工作区目录 basename。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

**错误 409：** 尚无成功/可恢复的 job 工作区（`NO_RESUMABLE_JOB`）；该公告已有运行中任务（`ANNOUNCEMENT_JOB_RUNNING`）；同 `jobId` 已在本进程运行（`JOB_ALREADY_RUNNING`）。

**错误 500 / 503：** 与 clean 对称。

### POST /api/v1/announcements/{announcementId}/extract

手动触发该公告的元数据 LLM 提取。从最近一次成功清理任务的 `merged.md` 正文段提取标题、招标人、代理机构、项目编号、截止时间、通用资格与子标包，并按「仅填空」语义落库。每次成功清理完成后也会自动触发一次。

请求体可为空或空对象 `{}`。

**响应 202：**

```json
{
  "announcementId": "ann-7c1e...",
  "lastExtractionStatus": "RUNNING"
}
```

提取异步执行。受理即同步置 `RUNNING` 并返回 202；已有在途提取时本次提交与其合并，同样返回 202。结果通过各公告响应中的 `lastExtractionStatus` / `lastExtractedAt` / `lastExtractionError` 观察；服务器重启会把残留 `RUNNING` 修复为 `FAILED`。

**错误 400：** body 非法 JSON（`INVALID_REQUEST`）。

**错误 403：** 服务器配置 `extraction_enabled=false`（`EXTRACTION_DISABLED`）。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

**错误 409：** 该公告尚无成功的清理任务（`NO_SUCCESSFUL_CLEAN_JOB`）。

**错误 503：** 服务器正在关闭，入队被拒绝（`SERVER_SHUTTING_DOWN`）。

### POST /api/v1/announcements/{announcementId}/match

手动触发该公告的产品-招标匹配。以数据库中的公告结构化字段（名称、招标人、代理机构、项目编号、截止日期、通用资格、有序子标包及金额/专用资格）与全部企业产品为输入调用 LLM，结论按公告 upsert 落库（只保留最新一次）。每次提取成功后也会自动触发一次；产品目录为空时自动触发静默跳过（不写匹配状态）。公告响应中的 `lastMatchStatus` / `lastMatchedAt` / `lastMatchError` 供轮询。

请求体可为空或空对象 `{}`。

**响应 202：**

```json
{
  "announcementId": "ann-7c1e...",
  "lastMatchStatus": "RUNNING"
}
```

匹配异步执行。受理即同步置 `RUNNING` 并返回 202；已有在途匹配时本次提交与其合并，同样返回 202。服务器重启会把残留 `RUNNING` 修复为 `FAILED`。

**错误 400：** body 非法 JSON（`INVALID_REQUEST`）。

**错误 403：** 服务器配置 `matching_enabled=false`（`MATCHING_DISABLED`）。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

**错误 409：** 产品目录为空（`NO_PRODUCTS`）。

**错误 503：** 服务器正在关闭，入队被拒绝（`SERVER_SHUTTING_DOWN`）。

**错误 500（`INTERNAL_ERROR`）：** 内部错误；`message` 固定为 `Internal server error`。

### GET /api/v1/announcements/{announcementId}/match-result

查询该公告最近一次匹配结论。

**响应 200：**

```json
{
  "announcementId": "ann-7c1e...",
  "possible": true,
  "reason": "公司产品「烟感探测器」与标包「火灾自动报警系统」的供货内容一致",
  "matchedProducts": ["烟感探测器"],
  "matchedKeywords": ["烟感"],
  "relevantSubLots": ["火灾自动报警系统"],
  "supportingEvidence": ["标包包含点型感烟探测器供货"],
  "risks": ["供货数量未在公告中明确"],
  "matchedAt": "2026-09-03T02:05:00Z"
}
```

五个列表为匹配时刻的名称快照：产品后续改名/删除不回溯该行。`reason` 非空。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）；公告存在但尚无匹配结果（`MATCH_RESULT_NOT_FOUND`）。

**错误 500（`INTERNAL_ERROR`）：** 内部错误；`message` 固定为 `Internal server error`。

### GET /api/v1/jobs/{jobId}

查询任务状态与详细进展。`statusUrl` 可由 `jobId` 独立构造为本路径。

**响应 200（运行中示例）：**

```json
{
  "jobId": "job-e071e952-d3b7-4be1-8e02-5324214e3cb5",
  "announcementId": "ann-7c1e...",
  "status": "RUNNING",
  "phase": "CONVERTING",
  "message": "Converting files",
  "createdAt": "2026-08-06T10:00:00Z",
  "updatedAt": "2026-08-06T10:01:12Z",
  "startedAt": "2026-08-06T10:00:00.100Z",
  "finishedAt": null,
  "jobDirectory": "E:\\data\\processed_tender\\job-e071e952-...",
  "progress": {
    "phaseIndex": 4,
    "phaseCount": 6,
    "phaseName": "CONVERTING",
    "phaseMessage": "Converting files",
    "phases": [
      {"name": "DISCOVERING", "message": "Discovering inputs", "state": "DONE", "startedAt": "...", "finishedAt": "..."},
      {"name": "ANALYZING_FILENAMES", "message": "Analyzing filenames", "state": "DONE", "startedAt": "...", "finishedAt": "..."},
      {"name": "DEDUPLICATING", "message": "Deduplicating inputs", "state": "DONE", "startedAt": "...", "finishedAt": "..."},
      {"name": "CONVERTING", "message": "Converting files", "state": "RUNNING", "startedAt": "...", "finishedAt": null},
      {"name": "FILTERING", "message": "Filtering content", "state": "PENDING", "startedAt": null, "finishedAt": null},
      {"name": "ASSEMBLING", "message": "Assembling output", "state": "PENDING", "startedAt": null, "finishedAt": null}
    ],
    "files": {
      "total": 28,
      "completed": 5,
      "failed": 0,
      "running": 1,
      "pending": 22,
      "byStatus": {
        "SUCCESS": 4,
        "CONVERTING": 1,
        "FILENAME_ANALYZED": 10,
        "EXCLUDED": 8,
        "DEDUPLICATED": 5
      }
    },
    "recentEvents": [
      {
        "timestamp": "2026-08-06T10:01:10Z",
        "status": "RUNNING",
        "fileId": "F000012",
        "message": "Converting file"
      }
    ]
  },
  "statistics": null,
  "manifestPath": null,
  "reviewPath": null,
  "mergedPath": null,
  "error": null
}
```

`progress.files` / `recentEvents[].fileId` 中的 `F######` 是流水线内部文件号，不是上传 `fileId`。

| 字段 | 类型 | 说明 |
|---|---|---|
| `jobId` | string | 任务 ID |
| `announcementId` | string? | 关联公告；未知时为 null |
| `status` | string | `CREATED` / `RUNNING` / `COMPLETED` / `COMPLETED_WITH_ERRORS` / `FAILED` |
| `phase` | string? | 当前阶段规范名（见下表） |
| `message` | string? | 最近进度消息 |
| `createdAt` / `updatedAt` / `startedAt` / `finishedAt` | string (ISO-8601) | 时间戳；运行中 `finishedAt` 为 null |
| `jobDirectory` | string? | 工作区本机路径，**仅调试** |
| `progress` | object | 阶段/文件/事件进展 |
| `statistics` | object? | 完成后的 FileStatus 聚合；运行中为 null |
| `manifestPath` / `reviewPath` / `mergedPath` | string? | 完成后的产物本机路径，**仅调试**；运行中为 null |
| `error` | object? | 任务级失败时 `{code,message}`；否则 null |

**完成后 200：** `status` 为 `COMPLETED` / `COMPLETED_WITH_ERRORS` / `FAILED`；填充 `statistics` 与三路径；`error` 在任务级失败时非 null。

**错误 404：** 未知 `jobId` 或不属于本进程注册表（重启后全部 404）。

**错误 405：** 非 GET 方法。

#### 阶段枚举与 listener 文案映射

| phaseName | listener message（兼容） |
| --- | --- |
| `DISCOVERING` | Discovering inputs |
| `ANALYZING_FILENAMES` | Analyzing filenames |
| `DEDUPLICATING` | Deduplicating inputs |
| `CONVERTING` | Converting files |
| `FILTERING` | Filtering content |
| `ASSEMBLING` | Assembling output |
| `RESUMING` | Resuming job（仅 resume） |
| `DONE` | Job completed / Job resumed |

核心在工作区创建/打开后会立刻发出 `CREATED` + `"Job created"`，供 HTTP 层尽早获得 `jobId`。

#### 首事件前失败策略

| 场景 | HTTP 行为 |
| --- | --- |
| 请求校验失败 | 400，不进入注册表 |
| 工作区创建/打开失败等导致 listener 首事件从未发出 | **不**返回 202；映射为 400（`IllegalArgumentException`）或 500（`TenderCleanerException` / 其他） |
| 等待 `jobId` 就绪超时 | 500，`JOB_ACCEPT_TIMEOUT` |
| 202 之后流水线失败 | 轮询可见 `status=FAILED` 与 `error` |

### GET /api/v1/jobs

正在执行任务的简要状态。仅 `CREATED` / `RUNNING`，不含终态。结束任务只靠单条 `GET /jobs/{jobId}` 或公告详情上的 `lastJobId`。重启后列表为空（即使 SQLite 有历史行）。

**响应 200：**

```json
{
  "jobs": [
    {
      "jobId": "job-e071...",
      "announcementId": "ann-7c1e...",
      "announcementName": "某电缆储检一体化库项目招标公告",
      "kind": "CLEAN",
      "status": "RUNNING",
      "phase": "CONVERTING",
      "message": "Converting files",
      "updatedAt": "2026-08-14T10:10:00Z",
      "statusUrl": "/api/v1/jobs/job-e071..."
    }
  ]
}
```

无运行中任务时返回 `{ "jobs": [] }`。`kind` 为 `CLEAN` 或 `RESUME`。

## relativePath 校验

挂接时的 `relativePath` 拒绝：空、`.`、`..`、绝对路径、盘符、前导 `/`、反斜杠、NUL、控制字符、长度 > 512、末尾 `/`。通过后规范化为 portable `/` 路径。最后一段视为文件名，中间段为目录。

合法示例：`招标文件/公告.pdf`、`a/b/c.txt`。

非法示例：`../secret`、`C:\\x`、`/abs`、`a\\b`、``（空）、`dir/`。

## 状态码与错误码

沿用 `{"error":{"code","message"}}`。

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | JSON/multipart 非法、相对路径非法、公告名为空、空上传、分页 `page`/`size` 非法、详情/子标包字段非法（金额、日期、数组元素等）、搜索参数非法（`keywords`、日期范围、`page`/`size`）、产品字段非法或产品 JSON 含未知键 |
| 403 | `EXTRACTION_DISABLED` | 服务器配置 `extraction_enabled=false` 时调用手动提取端点 |
| 403 | `MATCHING_DISABLED` | 服务器配置 `matching_enabled=false` 时调用手动匹配端点 |
| 404 | `ANNOUNCEMENT_NOT_FOUND` | 公告不存在（子标包路由统一优先判定；匹配端点与 match-result 端点同义） |
| 404 | `DETAIL_NOT_FOUND` | 公告缺少详情行（仅阶段 12 早期创建的存量数据可能出现；新建公告必带详情） |
| 404 | `SUB_LOT_NOT_FOUND` | 子标包不存在或不属于该公告 |
| 404 | `FILE_NOT_FOUND` | 上传文件不存在 |
| 404 | `FILE_NOT_ATTACHED` | 该公告未挂接指定 `fileId` |
| 404 | `PRODUCT_NOT_FOUND` | 产品不存在 |
| 404 | `MATCH_RESULT_NOT_FOUND` | 公告存在但尚无匹配结果 |
| 404 | （无专用码或资源码） | 未知 `jobId` |
| 409 | `RELATIVE_PATH_CONFLICT` | 同公告相对路径已占用，或与已有路径互为前缀 |
| 409 | `SUB_LOT_IDS_MISMATCH` | PUT 公告时 `detail.subLotIds` 非纯重排（增删/重复/漏 id） |
| 409 | `FILE_ALREADY_ATTACHED` | 同公告已挂接该 `fileId` |
| 409 | `FILE_IN_USE` | 删除仍被公告挂接的上传文件 |
| 409 | `ANNOUNCEMENT_JOB_RUNNING` | 该公告已有运行中 clean/resume（含删公告） |
| 409 | `JOB_ALREADY_RUNNING` | 同 `jobId` 重复 resume |
| 409 | `ANNOUNCEMENT_EMPTY` | 无文件时创建清理任务 |
| 409 | `NO_RESUMABLE_JOB` | 公告尚无成功/可恢复的 job 工作区 |
| 409 | `NO_SUCCESSFUL_CLEAN_JOB` | 手动提取时公告尚无成功的清理任务 |
| 409 | `PRODUCT_NAME_CONFLICT` | 产品名与既有产品冲突（创建/改名） |
| 409 | `NO_PRODUCTS` | 手动匹配时产品目录为空 |
| 413 | `UPLOAD_TOO_LARGE` | 超过 100 MiB |
| 500 | `JOB_ACCEPT_TIMEOUT` / `INVALID_TREE` / `TC-*` | 接受超时、损坏的目录树、内部错误 |
| 500 | `INTERNAL_ERROR` | 搜索与匹配端点内部错误（`message` 固定为 `Internal server error`） |
| 503 | `JOB_QUEUE_FULL` | 并发任务已满 |
| 503 | `SERVER_SHUTTING_DOWN` | 服务器正在关闭（任务接受、提取入队或匹配入队被拒绝） |

配置加载失败发生在进程启动阶段，错误码为 `TC-CONFIG-001`（缺文件/缺字段）或 `TC-CONFIG-002`（JSON 非法、路径互含等），理论上不会通过HTTP请求传给客户端（鬼知道bug会不会）。

