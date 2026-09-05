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
- 对应 commit hash：无（未创建功能提交）
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

- 功能 3：增加清理任务恢复——尚未开始。
- 功能 4：增加服务健康状态指示器——尚未开始。
- 功能 5：公告附件目录树——尚未开始。
- 功能 6：全局任务中心——尚未开始。
- 功能 7：文件详情抽屉和引用次数提示——尚未开始。
