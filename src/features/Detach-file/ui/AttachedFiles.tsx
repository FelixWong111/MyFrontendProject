import { DisconnectOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Empty,
  Popconfirm,
  Space,
  Table,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { useState } from "react";

import type {
  AnnouncementDetail,
  AnnouncementFile,
} from "@/entities/Announcement/announcement";
import { detachFile } from "@/features/Detach-file/api/detachFile";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";
import { formatFileSize } from "@/shared/lib/format";

interface AttachedFilesProps {
  announcement: AnnouncementDetail | null;
  error: string;
  loading: boolean;
  onDetached: (announcement: AnnouncementDetail) => void;
  onRetry: () => void;
  onStateMayHaveChanged: () => void;
}

export function AttachedFiles({
  announcement,
  error,
  loading,
  onDetached,
  onRetry,
  onStateMayHaveChanged,
}: AttachedFilesProps) {
  const { message } = App.useApp();
  const [detachingFileId, setDetachingFileId] = useState<string | null>(null);

  const handleDetach = async (file: AnnouncementFile) => {
    if (!announcement || detachingFileId) {
      return;
    }

    setDetachingFileId(file.fileId);
    try {
      const updatedAnnouncement = await detachFile(
        announcement.id,
        file.fileId,
      );
      message.success(`“${file.originalName}”已从当前公告卸下。`);
      onDetached(updatedAnnouncement);
    } catch (reason) {
      const error = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "File 卸下失败，请稍后重试。", {
          ANNOUNCEMENT_NOT_FOUND: "当前公告不存在，请刷新公告列表后重试。",
          FILE_NOT_ATTACHED: "该 File 已不在当前公告中，正在保留服务端状态。",
        }),
      );

      if (
        error.code === "ANNOUNCEMENT_NOT_FOUND" ||
        error.code === "FILE_NOT_ATTACHED"
      ) {
        onStateMayHaveChanged();
      }
    } finally {
      setDetachingFileId(null);
    }
  };

  const columns: TableColumnsType<AnnouncementFile> = [
    {
      title: "relativePath",
      dataIndex: "relativePath",
      key: "relativePath",
      render: (value: string) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: "文件名",
      dataIndex: "originalName",
      key: "originalName",
    },
    {
      title: "fileId",
      dataIndex: "fileId",
      key: "fileId",
      render: (fileId: string) => (
        <Typography.Text copyable={{ text: fileId }} code>
          {fileId}
        </Typography.Text>
      ),
    },
    {
      title: "大小",
      dataIndex: "sizeBytes",
      key: "sizeBytes",
      width: 110,
      render: (sizeBytes: number) => formatFileSize(sizeBytes),
    },
    {
      title: "操作",
      key: "actions",
      width: 100,
      render: (_, file) => (
        <Popconfirm
          title="卸下 File"
          description="只解除当前公告的挂接，不会删除已上传的 File。"
          okText="卸下"
          cancelText="取消"
          onConfirm={() => handleDetach(file)}
        >
          <Button
            danger
            type="text"
            icon={<DisconnectOutlined />}
            loading={detachingFileId === file.fileId}
          >
            卸下
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={onRetry}>
              重试
            </Button>
          }
        />
      ) : null}
      <Table<AnnouncementFile>
        columns={columns}
        dataSource={announcement?.files ?? []}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                announcement ? "当前公告尚未挂接 File" : "请先选择公告"
              }
            />
          ),
        }}
        pagination={false}
        rowKey="fileId"
        scroll={{ x: 760 }}
        size="small"
      />
    </Space>
  );
}
