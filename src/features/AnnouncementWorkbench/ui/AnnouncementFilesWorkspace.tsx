import { FolderOpenOutlined, PaperClipOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Collapse,
  Space,
  Spin,
  Typography,
} from "antd";
import { useEffect, useState } from "react";

import type {
  AnnouncementDetail,
  AnnouncementFile,
} from "@/entities/Announcement/announcement";
import { getFileContent } from "@/entities/Content-file/getFileContent";
import type { FileItem } from "@/entities/List-files/listFiles";
import { AttachFile } from "@/features/Attach-file/ui/AttachFile";
import { AnnouncementFileTree } from "@/features/AnnouncementWorkbench/ui/AnnouncementFileTree";
import { deleteFile } from "@/features/Delete-file/api/deleteFile";
import { UploadFile } from "@/features/Upload-file/ui/UploadFile";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";
import {
  canPreviewDocument,
  getDocumentPreviewKind,
} from "@/shared/components/document-viewer/documentTypes";
import { DocumentViewer } from "@/shared/components/document-viewer/DocumentViewer";
import { FileList } from "@/shared/components/FilesList/FilesList";

import styles from "./AnnouncementFilesWorkspace.module.css";

interface PreviewFile {
  fileId: string;
  originalName: string;
  source: "attachment" | "library";
}

interface AnnouncementFilesWorkspaceProps {
  announcement: AnnouncementDetail;
  announcementLoading: boolean;
  announcementError: string;
  fileListRefreshKey: number;
  onAnnouncementUpdated: (announcement: AnnouncementDetail) => void;
  onRefreshAnnouncement: () => void;
  onRefreshFiles: () => void;
  onStateMayHaveChanged: () => void;
}

export function AnnouncementFilesWorkspace({
  announcement,
  announcementLoading,
  announcementError,
  fileListRefreshKey,
  onAnnouncementUpdated,
  onRefreshAnnouncement,
  onRefreshFiles,
  onStateMayHaveChanged,
}: AnnouncementFilesWorkspaceProps) {
  const { message } = App.useApp();
  const [selectedLibraryFile, setSelectedLibraryFile] =
    useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [documentBlob, setDocumentBlob] = useState<Blob | null>(null);
  const [fileContentLoading, setFileContentLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileContentRefreshKey, setFileContentRefreshKey] = useState(0);

  const activePreviewFile =
    previewFile?.source === "attachment" &&
    !announcement.files.some((file) => file.fileId === previewFile.fileId)
      ? null
      : previewFile;
  const previewKind = getDocumentPreviewKind(activePreviewFile?.originalName);
  const canPreview = canPreviewDocument(activePreviewFile?.originalName);

  useEffect(() => {
    if (!activePreviewFile || !canPreview) {
      return;
    }

    let disposed = false;
    const controller = new AbortController();

    const loadFile = async () => {
      setDocumentBlob(null);
      setFileError("");
      setFileContentLoading(true);

      try {
        const result = await getFileContent(
          activePreviewFile.fileId,
          controller.signal,
        );
        if (!disposed) {
          setDocumentBlob(result.blob);
        }
      } catch (reason) {
        if (!disposed) {
          setFileError(
            getApiErrorMessage(reason, "无法读取这个文档。", {
              FILE_NOT_FOUND: "所选文件不存在或其存储内容已缺失。",
            }),
          );
        }
      } finally {
        if (!disposed) {
          setFileContentLoading(false);
        }
      }
    };

    void loadFile();

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [activePreviewFile, canPreview, fileContentRefreshKey]);

  const selectLibraryFile = (file: FileItem) => {
    setSelectedLibraryFile(file);
    setDocumentBlob(null);
    setFileError("");
    setFileContentLoading(false);
    setPreviewFile({
      fileId: file.fileId,
      originalName: file.originalName,
      source: "library",
    });
  };

  const selectAttachment = (file: AnnouncementFile) => {
    setDocumentBlob(null);
    setFileError("");
    setFileContentLoading(false);
    setPreviewFile({
      fileId: file.fileId,
      originalName: file.originalName,
      source: "attachment",
    });
  };

  const handleDeleteFile = async (file: FileItem) => {
    try {
      await deleteFile(file.fileId);
      message.success(`“${file.originalName}”已删除。`);
      if (selectedLibraryFile?.fileId === file.fileId) {
        setSelectedLibraryFile(null);
      }
      if (previewFile?.fileId === file.fileId) {
        setPreviewFile(null);
        setDocumentBlob(null);
      }
      onRefreshFiles();
    } catch (reason) {
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "文件删除失败，请稍后重试。", {
          FILE_NOT_FOUND: "这个文件已不存在，正在刷新文件列表。",
          FILE_IN_USE: "这个文件仍被公告挂接，请先从所有公告中卸下。",
        }),
      );
      if (
        apiError.code === "FILE_NOT_FOUND" ||
        apiError.code === "FILE_IN_USE"
      ) {
        onRefreshFiles();
      }
      throw reason;
    }
  };

  const handleFilesChanged = (updated: AnnouncementDetail) => {
    if (
      previewFile?.source === "attachment" &&
      !updated.files.some((file) => file.fileId === previewFile.fileId)
    ) {
      setPreviewFile(null);
      setDocumentBlob(null);
      setFileError("");
      setFileContentLoading(false);
    }
    onAnnouncementUpdated(updated);
    onRefreshFiles();
  };

  const displayedFileError = activePreviewFile
    ? !canPreview
      ? previewKind === "legacy-doc"
        ? "旧版 DOC 暂不支持浏览器预览，请将文件另存为 DOCX 或 PDF。"
        : "当前预览器支持 PDF 和 DOCX；这个文件仍可正常挂接到公告。"
      : fileError
    : "";

  return (
    <div className={styles.workspace}>
      <div className={styles.previewGrid}>
        <section className={styles.attachmentsPanel}>
          <div className={styles.panelHeading}>
            <div>
              <Typography.Title level={3}>公告附件</Typography.Title>
              <Typography.Text type="secondary">
                选择附件后在右侧直接核对 PDF 或 Word 原文。
              </Typography.Text>
            </div>
            <PaperClipOutlined />
          </div>
          <AnnouncementFileTree
            announcement={announcement}
            announcementError={announcementError}
            announcementLoading={announcementLoading}
            selectedFileId={activePreviewFile?.fileId ?? null}
            onDetached={handleFilesChanged}
            onRetryAnnouncement={onRefreshAnnouncement}
            onSelectFile={selectAttachment}
            onStateMayHaveChanged={onStateMayHaveChanged}
          />
        </section>

        <section className={styles.previewPanel}>
          <div className={styles.panelHeading}>
            <div>
              <Typography.Title level={3}>文档预览</Typography.Title>
              <Typography.Text type="secondary">
                {activePreviewFile?.originalName ?? "尚未选择文件"}
              </Typography.Text>
            </div>
          </div>
          {displayedFileError ? (
            <Alert
              type={canPreview ? "error" : "info"}
              showIcon
              message={displayedFileError}
              action={
                canPreview ? (
                  <Button
                    size="small"
                    onClick={() =>
                      setFileContentRefreshKey((value) => value + 1)
                    }
                  >
                    重试
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          <Spin
            spinning={Boolean(
              activePreviewFile && canPreview && fileContentLoading,
            )}
            tip="正在读取文件..."
          >
            <DocumentViewer
              key={`${activePreviewFile?.fileId ?? "no-file"}:${
                activePreviewFile && documentBlob ? "loaded" : "empty"
              }:${fileContentRefreshKey}`}
              documentBlob={activePreviewFile ? documentBlob : null}
              fileName={activePreviewFile?.originalName}
            />
          </Spin>
        </section>
      </div>

      <Collapse
        className={styles.libraryCollapse}
        defaultActiveKey={["library"]}
        items={[
          {
            key: "library",
            label: (
              <Space>
                <FolderOpenOutlined />
                <span>文件库、上传与挂接</span>
              </Space>
            ),
            children: (
              <div className={styles.libraryContent}>
                <div className={styles.libraryHeading}>
                  <div>
                    <Typography.Title level={3}>文件库</Typography.Title>
                    <Typography.Text type="secondary">
                      选择已有文件，或上传新文件后挂接到当前公告。
                    </Typography.Text>
                  </div>
                  <UploadFile onUploaded={onRefreshFiles} />
                </div>
                <FileList
                  refreshKey={fileListRefreshKey}
                  selectedFileId={selectedLibraryFile?.fileId ?? null}
                  onDeleteFile={handleDeleteFile}
                  onSelectFile={selectLibraryFile}
                />
                <AttachFile
                  announcement={announcement}
                  selectedFile={selectedLibraryFile}
                  onAttached={handleFilesChanged}
                  onFileMissing={(fileId) => {
                    if (selectedLibraryFile?.fileId === fileId) {
                      setSelectedLibraryFile(null);
                    }
                  }}
                  onStateMayHaveChanged={onStateMayHaveChanged}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
