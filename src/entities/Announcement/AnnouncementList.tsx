import { DeleteOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { useState } from "react";

import type { AnnouncementListItem } from "@/entities/Announcement/announcement";
import { formatDateTime } from "@/shared/lib/format";

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

  const columns: TableColumnsType<AnnouncementListItem> = [
    {
      title: "公告名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, announcement) => (
        <Button type="link" onClick={() => onSelect(announcement)}>
          {name}
        </Button>
      ),
    },
    {
      title: "announcementId",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <Typography.Text copyable={{ text: id }} code>
          {id}
        </Typography.Text>
      ),
    },
    {
      title: "文件数",
      dataIndex: "fileCount",
      key: "fileCount",
      width: 100,
      render: (fileCount: number) => <Tag>{fileCount}</Tag>,
    },
    {
      title: "最后修改时间",
      dataIndex: "lastModifiedTime",
      key: "lastModifiedTime",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "操作",
      key: "actions",
      width: 100,
      render: (_, announcement) => (
        <Popconfirm
          title="删除公告"
          description="将删除公告及其挂接关系，已上传的 File 不会被删除。"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(announcement)}
        >
          <Button
            danger
            type="text"
            icon={<DeleteOutlined />}
            loading={deletingId === announcement.id}
          >
            删除
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
      <Table<AnnouncementListItem>
        columns={columns}
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
        pagination={false}
        rowKey="id"
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedAnnouncementId
            ? [selectedAnnouncementId]
            : [],
          onSelect,
        }}
        scroll={{ x: 820 }}
        size="small"
      />
    </Space>
  );
}
