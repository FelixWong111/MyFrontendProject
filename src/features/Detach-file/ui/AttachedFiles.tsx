import {
  DisconnectOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Empty,
  List,
  Popconfirm,
  Space,
  Typography,
} from "antd";
import { useState } from "react";

import type {
  AnnouncementDetail,
  AnnouncementFile,
} from "@/entities/Announcement/announcement";
import { detachFile } from "@/features/Detach-file/api/detachFile";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";
import { getDocumentPreviewKind } from "@/shared/components/document-viewer/documentTypes";
import { formatFileSize } from "@/shared/lib/format";

import styles from "./AttachedFiles.module.css";

interface AttachedFilesProps {
  announcement: AnnouncementDetail | null;
  error: string;
  loading: boolean;
  selectedFileId?: string | null;
  onDetached: (announcement: AnnouncementDetail) => void;
  onRetry: () => void;
  onSelectFile?: (file: AnnouncementFile) => void;
  onStateMayHaveChanged: () => void;
}

export function AttachedFiles({
  announcement,
  error,
  loading,
  selectedFileId,
  onDetached,
  onRetry,
  onSelectFile,
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
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "File 卸下失败，请稍后重试。", {
          ANNOUNCEMENT_NOT_FOUND: "当前公告不存在，请刷新公告列表后重试。",
          FILE_NOT_ATTACHED: "该 File 已不在当前公告中，正在刷新状态。",
        }),
      );

      if (
        apiError.code === "ANNOUNCEMENT_NOT_FOUND" ||
        apiError.code === "FILE_NOT_ATTACHED"
      ) {
        onStateMayHaveChanged();
      }
    } finally {
      setDetachingFileId(null);
    }
  };

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
      <List<AnnouncementFile>
        className={styles.list}
        dataSource={announcement?.files ?? []}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={announcement ? "当前公告尚未挂接文件" : "请先选择公告"}
            />
          ),
        }}
        renderItem={(file) => {
          const previewKind = getDocumentPreviewKind(file.originalName);
          const fileIcon =
            previewKind === "pdf" ? (
              <FilePdfOutlined />
            ) : previewKind === "docx" || previewKind === "legacy-doc" ? (
              <FileWordOutlined />
            ) : (
              <FileOutlined />
            );
          const selected = selectedFileId === file.fileId;

          return (
            <List.Item className={styles.item}>
              <div
                className={`${styles.fileCard} ${selected ? styles.selected : ""}`}
              >
                <Button
                  className={styles.fileButton}
                  type="text"
                  icon={fileIcon}
                  onClick={() => onSelectFile?.(file)}
                >
                  <span className={styles.fileCopy}>
                    <Typography.Text ellipsis>{file.originalName}</Typography.Text>
                    <small title={file.relativePath}>{file.relativePath}</small>
                  </span>
                </Button>
                <span className={styles.fileSize}>{formatFileSize(file.sizeBytes)}</span>
                <Popconfirm
                  title="卸下文件"
                  description="只解除当前公告的挂接，不会删除已上传文件。"
                  okText="卸下"
                  cancelText="取消"
                  onConfirm={() => handleDetach(file)}
                >
                  <Button
                    danger
                    type="text"
                    size="small"
                    icon={<DisconnectOutlined />}
                    aria-label={`卸下${file.originalName}`}
                    loading={detachingFileId === file.fileId}
                  />
                </Popconfirm>
              </div>
            </List.Item>
          );
        }}
      />
    </Space>
  );
}
