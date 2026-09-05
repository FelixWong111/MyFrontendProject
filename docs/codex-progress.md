# Codex 开发进度

## 功能 1：产品查看/编辑按钮和产品编辑抽屉

- 状态：DONE
- 对应 commit hash：`291b5b4`
- 主要文件：
  - `src/entities/Product/product.ts`
  - `src/features/ProductWorkbench/model/productForm.ts`
  - `src/features/ProductWorkbench/ui/ProductFormFields.tsx`
  - `src/features/ProductWorkbench/ui/ProductEditDrawer.tsx`
  - `src/features/ProductWorkbench/ui/ProductWorkbench.tsx`
- 已完成内容：
  - 接入单产品查询 API `GET /api/v1/products/{productId}`。
  - 接入产品全量更新 API `PUT /api/v1/products/{productId}`。
  - 产品列表增加“查看/编辑”按钮。
  - 新增产品编辑抽屉，展示产品 ID、创建时间和更新时间。
  - 编辑抽屉支持修改产品名称、匹配关键词和产品简介。
  - 新增与编辑复用同一套表单校验和请求数据规范化逻辑。
  - 保存后使用后端响应更新产品列表，并处理参数非法、名称冲突和产品不存在错误。
  - 已通过 `npm run lint` 和 `npm run build`。
- 未完成内容：无。

## 功能 2：扩展清理任务进度

- 状态：BLOCKED
- 对应 commit hash：`0b7d9fa`（BLOCKED 记录提交）
- 本次修改的主要文件：无业务源码修改；仅更新 `docs/codex-progress.md`
- 已完成内容：
  - 已核对 `GET /api/v1/jobs/{jobId}` 文档、现有任务类型和进度组件。
  - 已确认现有 API 可提供阶段时间线、文件状态分布、失败总数和最近事件。
  - 已确认 `recentEvents[].fileId` 是流水线内部 `F######`，不是上传文件 ID。
- 未完成内容：
  - 未修改清理任务类型和 UI。
  - 未实现阶段时间线、失败文件和事件记录组件。
- 阻塞原因：
  - 现有 API 没有完整的失败文件明细。
  - `recentEvents` 只表示最近事件，可能截断，且不提供文件名、相对路径或逐文件错误。
  - 后端需补充逐文件结果数据，至少包含流水线文件编号、上传文件 ID 或文件名、相对路径、最终状态和错误信息。
- 验证结果：未修改业务源码；在实现和构建前完成接口契约检查并确认阻塞。

## 后续功能

## 功能 3：清理任务恢复

- 状态：DONE
- 对应 commit hash：`bf9a0ac`
- 主要修改文件：
  - `src/features/Process-Announcement/api/announcementProcessing.ts`
  - `src/features/Process-Announcement/ui/AnnouncementProcessingWorkspace.tsx`
  - `src/features/Process-Announcement/ui/AnnouncementProcessingWorkspace.module.css`
- 已实现内容：
  - 接入恢复接口并按文档提交 `{ "force": false }`。
  - 清理失败或部分完成时显示“恢复任务”按钮。
  - 恢复提交成功后复用现有任务轮询和公告快照刷新。
  - 已覆盖不可恢复、任务已运行、队列满、公告不存在和服务关闭错误提示。
- 未完成内容：无。
- 后端接口依赖：`POST /api/v1/announcements/{announcementId}/resume`
- 验证结果：`npm run lint`、`npm run build` 均通过；项目无独立 test 脚本。

## 功能 4：服务健康状态指示器

- 状态：DONE
- 对应 commit hash：`2954a7f`
- 主要修改文件：
  - `src/entities/System/systemStatus.ts`
  - `src/shared/components/ServiceStatus/ServiceStatus.tsx`
  - `src/shared/components/ServiceStatus/ServiceStatus.module.css`
  - `src/shared/components/AppShell/AppShell.tsx`
- 已实现内容：
  - 接入后端健康检查和版本接口。
  - 顶部显示正常、Docling 异常、后端不可用和检查中状态。
  - 状态弹层展示后端、Docling 及版本信息，并支持手动重查。
  - 健康状态每 30 秒刷新，页面重新可见时立即检查。
- 未完成内容：无。
- 后端接口依赖：`GET /api/v1/health`、`GET /api/v1/version`
- 验证结果：真实接口返回后端和 Docling 均为 `UP`；`npm run lint`、`npm run build` 均通过；项目无独立 test 脚本。

## 功能 5：公告附件目录树

- 状态：DONE
- 对应 commit hash：`fd1b37c`
- 主要修改文件：
  - `src/entities/Announcement/announcementTree.ts`
  - `src/features/AnnouncementWorkbench/ui/AnnouncementFileTree.tsx`
  - `src/features/AnnouncementWorkbench/ui/AnnouncementFileTree.module.css`
  - `src/features/AnnouncementWorkbench/ui/AnnouncementFilesWorkspace.tsx`
- 已实现内容：
  - 接入公告目录树接口并严格区分目录、文件节点。
  - 公告附件区域改为可展开目录树。
  - 文件节点支持选择后在原有 PDF/Word 预览器中打开。
  - 文件节点保留卸下操作，并在挂接变化后重新读取目录树。
  - 已覆盖公告不存在、目录损坏和请求失败状态。
- 未完成内容：无。
- 后端接口依赖：`GET /api/v1/announcements/{announcementId}/tree`
- 验证结果：真实接口返回有效根目录与节点；`npm run lint`、`npm run build` 均通过；项目无独立 test 脚本。

## 功能 6：全局任务中心

- 状态：DONE
- 对应 commit hash：`cd3cd5a`
- 主要修改文件：
  - `src/entities/Job/runningJobs.ts`
  - `src/features/TaskCenter/ui/TaskCenter.tsx`
  - `src/features/TaskCenter/ui/TaskCenter.module.css`
  - `src/shared/components/AppShell/AppShell.tsx`
  - `src/app/router.tsx`
- 已实现内容：
  - 接入当前运行任务列表接口，并复用后端返回的任务状态、阶段、消息和更新时间。
  - 在应用顶部增加带运行数量提示的全局任务中心入口。
  - 抽屉集中展示清理和恢复任务，支持手动刷新、定时轮询及页面重新可见时刷新。
  - 明确提示接口仅返回 `CREATED`、`RUNNING` 状态的当前任务，已结束任务不会伪装成历史记录。
  - `AppShell` 通过顶部操作插槽接入业务组件，保持 `shared` 层不反向依赖 `features` 层。
- 未完成内容：无。
- 后端接口依赖：`GET /api/v1/jobs`
- 验证结果：真实接口返回合法 `jobs` 数组；`npm run lint`、`npm run build` 均通过；项目无独立 test 脚本。

## 功能 7：文件详情抽屉和引用次数提示

- 状态：DONE
- 对应 commit hash：`7545a37`
- 主要修改文件：
  - `src/entities/Detail-file/getFileDetail.ts`
  - `src/features/FileDetails/ui/FileDetailDrawer.tsx`
  - `src/features/FileDetails/ui/FileDetailDrawer.module.css`
  - `src/shared/components/FilesList/FilesList.tsx`
  - `src/shared/components/FilesList/FilesList.css`
  - `src/features/AnnouncementWorkbench/ui/AnnouncementFileTree.tsx`
  - `src/features/AnnouncementWorkbench/ui/AnnouncementFileTree.module.css`
  - `src/features/AnnouncementWorkbench/ui/AnnouncementFilesWorkspace.tsx`
- 已实现内容：
  - 文件库新增“详情”操作，引用次数标签可直接打开引用明细。
  - 新增文件详情抽屉，展示文件名、文件 ID、大小、上传时间和后端返回的引用次数。
  - 抽屉展示每个引用公告的名称、公告 ID 和挂接路径，并提示被引用文件不可直接删除。
  - 公告目录树的文件节点新增详情入口，复用同一个详情抽屉。
  - 详情请求支持取消、手动刷新、失败重试，并在 `FILE_NOT_FOUND` 时关闭抽屉和刷新关联状态。
  - 挂接关系刷新后，已打开的详情抽屉会重新读取最新引用数据。
- 未完成内容：无。
- 后端接口依赖：`GET /api/v1/files`、`GET /api/v1/files/{fileId}`
- 验证结果：真实详情接口返回 `attachmentCount` 与完整 `attachments` 数组；`npm run lint`、`npm run build` 均通过；项目无独立 test 脚本。
