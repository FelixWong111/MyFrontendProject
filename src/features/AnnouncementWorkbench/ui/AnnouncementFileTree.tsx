import {
  DisconnectOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FolderOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Empty,
  Popconfirm,
  Spin,
  Tree,
  Typography,
} from "antd";
import type { TreeDataNode } from "antd";
import type { Key } from "react";
import { useEffect, useState } from "react";

import type {
  AnnouncementDetail,
  AnnouncementFile,
} from "@/entities/Announcement/announcement";
import {
  getAnnouncementTree,
  type AnnouncementTree as AnnouncementTreeResponse,
  type AnnouncementTreeNode,
} from "@/entities/Announcement/announcementTree";
import { detachFile } from "@/features/Detach-file/api/detachFile";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";
import { getDocumentPreviewKind } from "@/shared/components/document-viewer/documentTypes";
import { formatFileSize } from "@/shared/lib/format";

import styles from "./AnnouncementFileTree.module.css";

interface AnnouncementFileTreeProps {
  announcement: AnnouncementDetail;
  announcementLoading: boolean;
  announcementError: string;
  selectedFileId: string | null;
  onDetached: (announcement: AnnouncementDetail) => void;
  onRetryAnnouncement: () => void;
  onSelectFile: (file: AnnouncementFile) => void;
  onStateMayHaveChanged: () => void;
  onViewDetails: (file: AnnouncementFile) => void;
}

interface FileTreeDataNode extends TreeDataNode {
  attachment?: AnnouncementFile;
  children?: FileTreeDataNode[];
}

function getFileIcon(fileName: string) {
  const previewKind = getDocumentPreviewKind(fileName);
  if (previewKind === "pdf") return <FilePdfOutlined />;
  if (previewKind === "docx" || previewKind === "legacy-doc") {
    return <FileWordOutlined />;
  }
  return <FileOutlined />;
}

function collectDirectoryKeys(
  nodes: AnnouncementTreeNode[],
  parentPath = "",
): Key[] {
  return nodes.flatMap((node) => {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (node.type !== "directory") return [];
    return [
      `directory:${path}`,
      ...collectDirectoryKeys(node.children, path),
    ];
  });
}

export function AnnouncementFileTree({
  announcement,
  announcementLoading,
  announcementError,
  selectedFileId,
  onDetached,
  onRetryAnnouncement,
  onSelectFile,
  onStateMayHaveChanged,
  onViewDetails,
}: AnnouncementFileTreeProps) {
  const { message } = App.useApp();
  const [tree, setTree] = useState<AnnouncementTreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [detachingFileId, setDetachingFileId] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();

    const loadTree = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await getAnnouncementTree(
          announcement.id,
          controller.signal,
        );
        if (!disposed) {
          setTree(result);
          setExpandedKeys(collectDirectoryKeys(result.root.children));
        }
      } catch (reason) {
        if (disposed) return;

        const apiError = getApiError(reason);
        setTree(null);
        setError(
          getApiErrorMessage(reason, "公告附件目录加载失败，请稍后重试。", {
            ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新公告列表。",
            INVALID_TREE: "公告附件目录数据损坏，请联系后端检查挂接路径。",
          }),
        );
        if (apiError.code === "ANNOUNCEMENT_NOT_FOUND") {
          onStateMayHaveChanged();
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void loadTree();
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [announcement.id, announcement.lastModifiedTime, onStateMayHaveChanged, reloadKey]);

  const handleDetach = async (file: AnnouncementFile) => {
    if (detachingFileId) return;
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
        getApiErrorMessage(reason, "文件卸下失败，请稍后重试。", {
          ANNOUNCEMENT_NOT_FOUND: "当前公告不存在，请刷新公告列表后重试。",
          FILE_NOT_ATTACHED: "该文件已不在当前公告中，正在刷新状态。",
        }),
      );
      if (
        apiError.code === "ANNOUNCEMENT_NOT_FOUND" ||
        apiError.code === "FILE_NOT_ATTACHED"
      ) {
        setReloadKey((value) => value + 1);
        onStateMayHaveChanged();
      }
    } finally {
      setDetachingFileId(null);
    }
  };

  const buildTreeData = (
    nodes: AnnouncementTreeNode[],
    parentPath = "",
  ): FileTreeDataNode[] =>
    nodes.map((node) => {
      const relativePath = parentPath
        ? `${parentPath}/${node.name}`
        : node.name;

      if (node.type === "directory") {
        return {
          key: `directory:${relativePath}`,
          title: <span className={styles.directoryName}>{node.name}</span>,
          icon: <FolderOutlined />,
          selectable: false,
          children: buildTreeData(node.children, relativePath),
        };
      }

      const attachment: AnnouncementFile = {
        fileId: node.fileId,
        originalName: node.originalName,
        relativePath,
        sizeBytes: node.sizeBytes,
      };

      return {
        key: `file:${node.fileId}`,
        isLeaf: true,
        icon: getFileIcon(node.originalName),
        attachment,
        title: (
          <div className={styles.fileNode} title={node.originalName}>
            <span className={styles.fileCopy}>
              <Typography.Text ellipsis>{node.name}</Typography.Text>
              <small>{formatFileSize(node.sizeBytes)}</small>
            </span>
            <span className={styles.fileActions}>
              <Button
                type="text"
                size="small"
                icon={<InfoCircleOutlined />}
                aria-label={`查看${node.originalName}详情`}
                onClick={(event) => {
                  event.stopPropagation();
                  onViewDetails(attachment);
                }}
              />
              <Popconfirm
                title="卸下文件"
                description="只解除当前公告的挂接，不会删除已上传文件。"
                okText="卸下"
                cancelText="取消"
                onConfirm={() => void handleDetach(attachment)}
              >
                <Button
                  danger
                  type="text"
                  size="small"
                  icon={<DisconnectOutlined />}
                  loading={detachingFileId === node.fileId}
                  aria-label={`卸下${node.originalName}`}
                  onClick={(event) => event.stopPropagation()}
                />
              </Popconfirm>
            </span>
          </div>
        ),
      };
    });

  const treeData = tree ? buildTreeData(tree.root.children) : [];
  const visibleError = announcementError || error;

  return (
    <div className={styles.wrapper}>
      {visibleError ? (
        <Alert
          type="error"
          showIcon
          message={visibleError}
          action={
            <Button
              size="small"
              onClick={() => {
                onRetryAnnouncement();
                setReloadKey((value) => value + 1);
              }}
            >
              重试
            </Button>
          }
        />
      ) : null}

      <Spin spinning={announcementLoading || loading} tip="正在读取附件目录...">
        {treeData.length ? (
          <Tree<FileTreeDataNode>
            blockNode
            showIcon
            className={styles.tree}
            expandedKeys={expandedKeys}
            selectedKeys={selectedFileId ? [`file:${selectedFileId}`] : []}
            treeData={treeData}
            onExpand={(keys) => setExpandedKeys(keys)}
            onSelect={(_, info) => {
              if (info.node.attachment) onSelectFile(info.node.attachment);
            }}
          />
        ) : !loading && !visibleError ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前公告尚未挂接文件"
          />
        ) : (
          <div className={styles.loadingSpace} />
        )}
      </Spin>
    </div>
  );
}
