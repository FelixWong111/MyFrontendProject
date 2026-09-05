import {
  DeleteOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { useEffect, useState } from "react";

import { listFiles } from "@/entities/List-files/listFiles";
import type { FileItem } from "@/entities/List-files/listFiles";
import { getApiErrorMessage } from "@/shared/api/apiError";
import { getDocumentPreviewKind } from "@/shared/components/document-viewer/documentTypes";
import { formatDateTime, formatFileSize } from "@/shared/lib/format";

import "./FilesList.css";

const PAGE_SIZE = 20;

interface FileListProps {
  refreshKey: number;
  selectedFileId: string | null;
  onDeleteFile: (file: FileItem) => Promise<void>;
  onSelectFile: (file: FileItem) => void;
  onViewDetails: (file: FileItem) => void;
}

export function FileList({
  refreshKey,
  selectedFileId,
  onDeleteFile,
  onSelectFile,
  onViewDetails,
}: FileListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let disposed = false;

    const loadFiles = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await listFiles(currentPage, PAGE_SIZE);

        if (disposed) {
          return;
        }

        const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
        if (currentPage > lastPage) {
          setCurrentPage(lastPage);
          return;
        }

        setFiles(result.files);
        setTotal(result.total);
      } catch (reason) {
        if (!disposed) {
          setError(
            getApiErrorMessage(reason, "File 列表加载失败，请稍后重试。", {
              INVALID_REQUEST: "File 列表分页参数无效。",
            }),
          );
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void loadFiles();

    return () => {
      disposed = true;
    };
  }, [currentPage, refreshKey, reloadKey]);

  const handleDelete = async (file: FileItem) => {
    if (deletingFileId) {
      return;
    }

    setDeletingFileId(file.fileId);
    try {
      await onDeleteFile(file);
      setReloadKey((value) => value + 1);
    } catch {
      // 上层负责依据 API 错误码展示反馈。
    } finally {
      setDeletingFileId(null);
    }
  };

  const columns: TableColumnsType<FileItem> = [
    {
      title: "文件名",
      dataIndex: "originalName",
      key: "originalName",
      render: (name: string, file) => {
        const previewKind = getDocumentPreviewKind(name);
        const icon =
          previewKind === "pdf" ? (
            <FilePdfOutlined />
          ) : previewKind === "docx" || previewKind === "legacy-doc" ? (
            <FileWordOutlined />
          ) : (
            <FileOutlined />
          );

        return (
          <Button
            className="files-list__name"
            type="link"
            icon={icon}
            onClick={() => onSelectFile(file)}
          >
            {name}
          </Button>
        );
      },
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
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
    {
      title: "引用次数",
      dataIndex: "attachmentCount",
      key: "attachmentCount",
      width: 120,
      render: (count: number, file) => (
        <Tooltip
          title={
            count > 0
              ? `查看该文件在 ${count} 个公告中的引用`
              : "查看文件详情"
          }
        >
          <Button
            className="files-list__reference-button"
            type="text"
            size="small"
            aria-label={`查看文件详情，引用次数 ${count}`}
            onClick={() => onViewDetails(file)}
          >
            <Tag color={count > 0 ? "blue" : "default"}>{count}</Tag>
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 190,
      render: (_, file) => {
        const deleteButton = (
          <Button
            danger
            type="text"
            icon={<DeleteOutlined />}
            disabled={file.attachmentCount > 0}
            loading={deletingFileId === file.fileId}
          >
            删除
          </Button>
        );

        const deleteAction =
          file.attachmentCount > 0 ? (
            <Tooltip title="该 File 仍被公告挂接，请先从所有公告中卸下。">
              <span>{deleteButton}</span>
            </Tooltip>
          ) : (
            <Popconfirm
              title="删除 File"
              description="将永久删除这个已上传 File，且无法恢复。"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(file)}
            >
              {deleteButton}
            </Popconfirm>
          );

        return (
          <Space size={4}>
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={() => onViewDetails(file)}
            >
              详情
            </Button>
            {deleteAction}
          </Space>
        );
      },
    },
  ];

  return (
    <Space
      className="files-list"
      direction="vertical"
      size={12}
      style={{ width: "100%" }}
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button
              size="small"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              重试
            </Button>
          }
        />
      ) : null}
      <Table<FileItem>
        columns={columns}
        dataSource={files}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无已上传 File"
            />
          ),
        }}
        pagination={{
          current: currentPage,
          pageSize: PAGE_SIZE,
          total,
          hideOnSinglePage: total <= PAGE_SIZE,
          showSizeChanger: false,
          showTotal: (value) => `共 ${value} 个 File`,
          onChange: setCurrentPage,
        }}
        rowClassName={(file) =>
          file.fileId === selectedFileId
            ? "files-list__row--selected"
            : ""
        }
        rowKey="fileId"
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedFileId ? [selectedFileId] : [],
          onSelect: onSelectFile,
        }}
        scroll={{ x: 980 }}
        size="small"
      />
    </Space>
  );
}
