import { App, Button, Form, Input, Space, Typography } from "antd";
import { useEffect, useState } from "react";

import type { AnnouncementDetail } from "@/entities/Announcement/announcement";
import type { FileItem } from "@/entities/List-files/listFiles";
import { attachFile } from "@/features/Attach-file/api/attachFile";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";

interface AttachFileValues {
  relativePath: string;
}

interface AttachFileProps {
  announcement: AnnouncementDetail | null;
  selectedFile: FileItem | null;
  onAttached: (announcement: AnnouncementDetail) => void;
  onFileMissing: (fileId: string) => void;
  onStateMayHaveChanged: () => void;
}

export function AttachFile({
  announcement,
  selectedFile,
  onAttached,
  onFileMissing,
  onStateMayHaveChanged,
}: AttachFileProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<AttachFileValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    form.setFieldValue(
      "relativePath",
      announcement && selectedFile
        ? `${announcement.name}/${selectedFile.originalName}`
        : "",
    );
  }, [announcement, form, selectedFile]);

  const handleFinish = async ({ relativePath }: AttachFileValues) => {
    if (!announcement || !selectedFile || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedAnnouncement = await attachFile(announcement.id, {
        fileId: selectedFile.fileId,
        relativePath,
      });
      form.resetFields(["relativePath"]);
      message.success(`“${selectedFile.originalName}”已挂接到当前公告。`);
      onAttached(updatedAnnouncement);
    } catch (reason) {
      const error = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "File 挂接失败，请稍后重试。", {
          INVALID_REQUEST: "relativePath 不合法，请按文档要求使用 / 分隔的相对路径。",
          ANNOUNCEMENT_NOT_FOUND: "当前公告不存在，请刷新公告列表后重试。",
          FILE_NOT_FOUND: "所选 File 不存在，请刷新 File 列表后重试。",
          RELATIVE_PATH_CONFLICT: "relativePath 已占用，或与已有路径互为前缀。",
          FILE_ALREADY_ATTACHED: "所选 File 已经挂接到当前公告。",
        }),
      );

      if (
        error.code === "ANNOUNCEMENT_NOT_FOUND" ||
        error.code === "FILE_NOT_FOUND" ||
        error.code === "FILE_ALREADY_ATTACHED"
      ) {
        onStateMayHaveChanged();
      }

      if (error.code === "FILE_NOT_FOUND") {
        onFileMissing(selectedFile.fileId);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = !announcement || !selectedFile;

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <Typography.Text type="secondary">
        当前公告：{announcement?.name ?? "未选择"}；当前 File：
        {selectedFile?.originalName ?? "未选择"}
      </Typography.Text>
      <Form<AttachFileValues>
        form={form}
        layout="inline"
        onFinish={(values) => void handleFinish(values)}
      >
        <Form.Item
          name="relativePath"
          rules={[{ required: true, message: "请输入 relativePath" }]}
          style={{ flex: 1, minWidth: 260 }}
        >
          <Input
            aria-label="relativePath"
            disabled={disabled || submitting}
            placeholder="选择 File 后自动生成"
            readOnly
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            disabled={disabled}
            loading={submitting}
          >
            挂接 File
          </Button>
        </Form.Item>
      </Form>
      <Typography.Text type="secondary">
        relativePath 按“公告名称/File 原始文件名”自动生成并原样提交。
      </Typography.Text>
    </Space>
  );
}
