import {
  FileOutlined,
  PaperClipOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Empty,
  List,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";

import {
  getFileDetail,
  type Attachment,
  type FileDetail,
} from "@/entities/Detail-file/getFileDetail";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";
import { formatDateTime, formatFileSize } from "@/shared/lib/format";

import styles from "./FileDetailDrawer.module.css";

export interface FileDetailTarget {
  fileId: string;
  originalName: string;
}

interface FileDetailDrawerProps {
  file: FileDetailTarget | null;
  open: boolean;
  refreshKey: number;
  onClose: () => void;
  onFileMissing: (fileId: string) => void;
}

export function FileDetailDrawer({
  file,
  open,
  refreshKey,
  onClose,
  onFileMissing,
}: FileDetailDrawerProps) {
  const { message } = App.useApp();
  const [detail, setDetail] = useState<FileDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const activeFileId = file?.fileId ?? null;
  const visibleDetail = detail?.fileId === activeFileId ? detail : null;

  useEffect(() => {
    if (!open || !activeFileId) return;

    let disposed = false;
    const controller = new AbortController();

    const loadDetail = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await getFileDetail(activeFileId, controller.signal);
        if (!disposed) setDetail(result);
      } catch (reason) {
        if (disposed) return;

        const apiError = getApiError(reason);
        if (apiError.code === "FILE_NOT_FOUND") {
          message.error("该文件已不存在，正在刷新文件列表。");
          onFileMissing(activeFileId);
          return;
        }

        setError(getApiErrorMessage(reason, "文件详情加载失败，请稍后重试。"));
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void loadDetail();

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [activeFileId, message, onFileMissing, open, refreshKey, reloadKey]);

  const renderAttachment = (attachment: Attachment) => (
    <List.Item className={styles.referenceItem}>
      <List.Item.Meta
        avatar={<PaperClipOutlined className={styles.referenceIcon} />}
        title={attachment.announcementName}
        description={
          <Space direction="vertical" size={2}>
            <Typography.Text type="secondary">
              挂接路径：{attachment.relativePath}
            </Typography.Text>
            <Typography.Text
              type="secondary"
              copyable={{ text: attachment.announcementId }}
            >
              公告 ID：{attachment.announcementId}
            </Typography.Text>
          </Space>
        }
      />
    </List.Item>
  );

  return (
    <Drawer
      destroyOnHidden
      open={open}
      title={
        <Space>
          <FileOutlined />
          <span>文件详情</span>
        </Space>
      }
      width={620}
      onClose={onClose}
      extra={
        <Button
          type="text"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => setReloadKey((value) => value + 1)}
        >
          刷新
        </Button>
      }
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => setReloadKey((value) => value + 1)}>
              重试
            </Button>
          }
        />
      ) : null}

      <Skeleton active loading={loading && !visibleDetail} paragraph={{ rows: 8 }}>
        {visibleDetail ? (
          <Space className={styles.content} direction="vertical" size={20}>
            <Descriptions
              bordered
              column={1}
              size="small"
              items={[
                {
                  key: "originalName",
                  label: "文件名",
                  children: visibleDetail.originalName,
                },
                {
                  key: "fileId",
                  label: "文件 ID",
                  children: (
                    <Typography.Text copyable={{ text: visibleDetail.fileId }} code>
                      {visibleDetail.fileId}
                    </Typography.Text>
                  ),
                },
                {
                  key: "sizeBytes",
                  label: "文件大小",
                  children: formatFileSize(visibleDetail.sizeBytes),
                },
                {
                  key: "createdAt",
                  label: "上传时间",
                  children: formatDateTime(visibleDetail.createdAt),
                },
                {
                  key: "attachmentCount",
                  label: "引用次数",
                  children: (
                    <Tag color={visibleDetail.attachmentCount > 0 ? "blue" : "default"}>
                      {visibleDetail.attachmentCount} 个公告
                    </Tag>
                  ),
                },
              ]}
            />

            <Alert
              type={visibleDetail.attachmentCount > 0 ? "info" : "success"}
              showIcon
              message={
                visibleDetail.attachmentCount > 0
                  ? `该文件当前被 ${visibleDetail.attachmentCount} 个公告引用`
                  : "该文件当前未被任何公告引用"
              }
              description={
                visibleDetail.attachmentCount > 0
                  ? "被引用的文件不能直接删除，请先从下列公告中逐一卸下。"
                  : "当前没有挂接关系，可以从文件库中删除。"
              }
            />

            <section>
              <div className={styles.sectionHeading}>
                <Typography.Title level={5}>引用公告</Typography.Title>
                <Typography.Text type="secondary">
                  共 {visibleDetail.attachments.length} 条
                </Typography.Text>
              </div>
              <List<Attachment>
                className={styles.referenceList}
                dataSource={visibleDetail.attachments}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无引用公告"
                    />
                  ),
                }}
                renderItem={renderAttachment}
              />
            </section>
          </Space>
        ) : null}
      </Skeleton>
    </Drawer>
  );
}
