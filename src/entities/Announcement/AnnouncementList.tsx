import {
  ClockCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  List,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";

import type { AnnouncementListItem } from "@/entities/Announcement/announcement";
import { formatDateTime } from "@/shared/lib/format";

import styles from "./AnnouncementList.module.css";

interface AnnouncementListProps {
  announcements: AnnouncementListItem[];
  error: string;
  loading: boolean;
  selectedAnnouncementId: string | null;
  onDelete: (announcement: AnnouncementListItem) => Promise<void>;
  onRetry: () => void;
  onSelect: (announcement: AnnouncementListItem) => void;
}

export function AnnouncementList({
  announcements,
  error,
  loading,
  selectedAnnouncementId,
  onDelete,
  onRetry,
  onSelect,
}: AnnouncementListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (announcement: AnnouncementListItem) => {
    if (deletingId) {
      return;
    }

    setDeletingId(announcement.id);
    try {
      await onDelete(announcement);
    } catch {
      // 上层负责依据 API 错误码展示反馈。
    } finally {
      setDeletingId(null);
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
      <List<AnnouncementListItem>
        className={styles.list}
        dataSource={announcements}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无公告，请先新建公告"
            />
          ),
        }}
        renderItem={(announcement) => {
          const selected = selectedAnnouncementId === announcement.id;
          return (
            <List.Item className={styles.item}>
              <div
                className={`${styles.announcementCard} ${
                  selected ? styles.selected : ""
                }`}
                role="button"
                tabIndex={0}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(announcement)}
                onKeyDown={(event) => {
                  if (event.currentTarget !== event.target) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(announcement);
                  }
                }}
              >
                <div className={styles.cardHeading}>
                  <span className={styles.documentIcon} aria-hidden="true">
                    <FileTextOutlined />
                  </span>
                  <Typography.Text className={styles.name} ellipsis>
                    {announcement.name}
                  </Typography.Text>
                  <div onClick={(event) => event.stopPropagation()}>
                    <Popconfirm
                      title="删除公告"
                      description="将删除公告、详情及全部子标包；已上传文件不会被删除。"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(announcement)}
                    >
                      <Button
                        danger
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        aria-label={`删除${announcement.name}`}
                        loading={deletingId === announcement.id}
                      />
                    </Popconfirm>
                  </div>
                </div>

                <div className={styles.metaRow}>
                  <Tag>{announcement.fileCount} 个文件</Tag>
                  {announcement.lastJobId ? (
                    <Tag color="cyan">已有处理任务</Tag>
                  ) : (
                    <Tag>尚未处理</Tag>
                  )}
                </div>

                <div className={styles.timeRow}>
                  <ClockCircleOutlined />
                  <span>{formatDateTime(announcement.lastModifiedTime)}</span>
                </div>
              </div>
            </List.Item>
          );
        }}
      />
    </Space>
  );
}
