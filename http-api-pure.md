# 招标管理 HTTP API

## 资源模型

| 前端概念 | 标识符 | 生成方 | 落点 |
| --- | --- | --- | --- |
| 上传文件 | `"file-" + UUID` | HTTP 上传层 | `{raw}/blobs/{fileId}` + SQLite `uploaded_files` |
| 招标公告 | `"ann-" + UUID` | HTTP 创建层 | SQLite `announcements` + `announcement_files` |
| 清理任务 | `"job-" + UUID` | 现有 `JobWorkspace`（不改生成规则） | 进程内 `JobTracker` + SQLite `clean_jobs` 终态；输出在 `{processed}/job-.../` |

流水线内部 `FileEntry.fileId`（`F000001` 形式）只存在于 manifest / 进度事件，**不要**与上传 `fileId` 混用。

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
| 200 | 成功（查询、挂接/卸下后返回详情） |
| 201 | 创建成功（上传文件、创建公告） |
| 202 | 任务已接受（clean/resume 提交成功） |
| 204 | 删除成功，无响应体 |
| 400 | 请求参数无效 |
| 404 | 资源不存在，或 `jobId` 不属于本进程注册表 |
| 405 | HTTP 方法不支持 |
| 409 | 冲突（路径占用、文件仍被引用、公告任务运行中等） |
| 413 | 上传超过 100 MiB |
| 500 | 服务器内部错误（含接受超时、首事件前失败等） |
| 503 | 任务上限已满（`JOB_QUEUE_FULL`）或服务器正在关闭（`SERVER_SHUTTING_DOWN`） |

### CORS 与绑定

- 只绑定回环，无认证、无 TLS。
- 允许本机前端：`Access-Control-Allow-Origin` 反射 `http://127.0.0.1:*` 与 `http://localhost:*`。
- 允许方法：`GET, POST, DELETE, OPTIONS`；允许请求头：`Content-Type`。

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

### POST /api/v1/announcements

创建招标公告。

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
  "lastJobId": null
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | `"ann-" + UUID` |
| `name` | string | 公告名称 |
| `lastModifiedTime` | string | 创建、挂接、卸下时更新 |
| `files` | array | 创建时为空 |
| `lastGeneratedCleanedAnnouncementTime` | string? | 最近一次成功生成清理公告的时间；初值为 null |
| `lastJobId` | string? | 最近一次被接受的 clean/resume；从未提交过为 null |

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
      "lastJobId": "job-e071e952-d3b7-4be1-8e02-5324214e3cb5"
    }
  ]
}
```

`lastJobId` 与 `lastGeneratedCleanedAnnouncementTime` 均为 `string?`；从未提交过任务时为 `null`。

### GET /api/v1/announcements/{announcementId}

公告详情，含扁平 `files`。

**响应 200：**

```json
{
  "id": "ann-7c1e...",
  "name": "...",
  "lastModifiedTime": "2026-08-14T10:05:00Z",
  "lastGeneratedCleanedAnnouncementTime": "2026-08-14T11:00:00Z",
  "lastJobId": "job-e071e952-d3b7-4be1-8e02-5324214e3cb5",
  "files": [
    {
      "fileId": "file-3f2c...",
      "relativePath": "招标文件/公告.pdf",
      "originalName": "招标公告.pdf",
      "sizeBytes": 1048576
    }
  ]
}
```

`lastJobId` 为 `string?`：最近一次被接受的 clean/resume；从未提交过为 `null`（字段始终出现，值为 `null` 或 job id，不省略键）。

**错误 404：** 未知公告（`ANNOUNCEMENT_NOT_FOUND`）。

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

### POST /api/v1/announcements/{announcementId}/files

将已上传文件按指定相对路径挂到公告上。成功返回更新后的公告详情（形状同 `GET .../{id}`）。

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

从该公告卸下挂接，返回更新后的公告详情。不删除共享 blob 与 `uploaded_files` 行。更新 `lastModifiedTime`。卸下后目录树以挂接表为准重建，不扫磁盘。

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
| 400 | `INVALID_REQUEST` | JSON/multipart 非法、相对路径非法、公告名为空、空上传、分页 `page`/`size` 非法 |
| 404 | `ANNOUNCEMENT_NOT_FOUND` | 公告不存在 |
| 404 | `FILE_NOT_FOUND` | 上传文件不存在 |
| 404 | `FILE_NOT_ATTACHED` | 该公告未挂接指定 `fileId` |
| 404 | （无专用码或资源码） | 未知 `jobId` |
| 409 | `RELATIVE_PATH_CONFLICT` | 同公告相对路径已占用，或与已有路径互为前缀 |
| 409 | `FILE_ALREADY_ATTACHED` | 同公告已挂接该 `fileId` |
| 409 | `FILE_IN_USE` | 删除仍被公告挂接的上传文件 |
| 409 | `ANNOUNCEMENT_JOB_RUNNING` | 该公告已有运行中 clean/resume（含删公告） |
| 409 | `JOB_ALREADY_RUNNING` | 同 `jobId` 重复 resume |
| 409 | `ANNOUNCEMENT_EMPTY` | 无文件时创建清理任务 |
| 409 | `NO_RESUMABLE_JOB` | 公告尚无成功/可恢复的 job 工作区 |
| 413 | `UPLOAD_TOO_LARGE` | 超过 100 MiB |
| 500 | `JOB_ACCEPT_TIMEOUT` / `INVALID_TREE` / `TC-*` | 接受超时、损坏的目录树、内部错误 |
| 503 | `JOB_QUEUE_FULL` | 并发任务已满 |
| 503 | `SERVER_SHUTTING_DOWN` | 服务器正在关闭 |

配置加载失败发生在进程启动阶段，错误码为 `TC-CONFIG-001`（缺文件/缺字段）或 `TC-CONFIG-002`（JSON 非法、路径互含等），理论上不会通过HTTP请求传给客户端（鬼知道bug会不会）。

