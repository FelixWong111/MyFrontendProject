import { App, Alert, Button, Divider, Spin, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";

import { AnnouncementList } from "@/entities/Announcement/AnnouncementList";
import type {
  AnnouncementDetail,
  AnnouncementListItem,
} from "@/entities/Announcement/announcement";
import { getFileContent } from "@/entities/Content-file/getFileContent";
import type { FileItem } from "@/entities/List-files/listFiles";
import { AttachFile } from "@/features/Attach-file/ui/AttachFile";
import { CreateAnnouncement } from "@/features/Create-Announcement/ui/CreateAnnouncement";
import { deleteAnnouncement } from "@/features/Delete-Announcement/api/deleteAnnouncement";
import { deleteFile } from "@/features/Delete-file/api/deleteFile";
import { AttachedFiles } from "@/features/Detach-file/ui/AttachedFiles";
import { ReviewPanel } from "@/features/ReviewPanel/ReviewPanel";
import { UploadFile } from "@/features/Upload-file/ui/UploadFile";
import { useAnnouncementPage } from "@/pages/announcement/model/useAnnouncementPage";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";
import { FileList } from "@/shared/components/FilesList/FilesList";
import { SectionCard } from "@/shared/components/SectionCard/SectionCard";
import { PDF_viewer } from "@/shared/components/pdf-viewer/pdf-viewer";

import styles from "./AnnouncementPage.module.css";

export function AnnouncementPage() {
  const { message } = App.useApp();
  const {
    announcements,
    announcementsLoading,
    announcementsError,
    selectedAnnouncementId,
    selectedAnnouncement,
    announcementDetailLoading,
    announcementDetailError,
    fileListRefreshKey,
    selectAnnouncement,
    refreshAnnouncements,
    refreshSelectedAnnouncement,
    refreshFiles,
    applyAnnouncementDetail,
    removeAnnouncement,
  } = useAnnouncementPage();
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const selectedFileRef = useRef<FileItem | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [fileContentLoading, setFileContentLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileContentRefreshKey, setFileContentRefreshKey] = useState(0);
  const canPreviewSelectedFile = Boolean(
    selectedFile?.originalName.toLowerCase().endsWith(".pdf"),
  );

  useEffect(() => {
    if (!selectedFile || !canPreviewSelectedFile) {
      return;
    }

    let disposed = false;

    const loadFile = async () => {
      setPdfBlob(null);
      setFileError("");
      setFileContentLoading(true);

      try {
        const result = await getFileContent(selectedFile.fileId);
        if (!disposed) {
          setPdfBlob(result.blob);
        }
      } catch (reason) {
        if (!disposed) {
          setFileError(
            getApiErrorMessage(reason, "无法读取这个 PDF File。", {
              FILE_NOT_FOUND: "所选 File 不存在或其 blob 已缺失。",
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
    };
  }, [canPreviewSelectedFile, fileContentRefreshKey, selectedFile]);

  const handleSelectFile = (file: FileItem) => {
    if (file.fileId === selectedFile?.fileId) {
      setFileContentRefreshKey((value) => value + 1);
      return;
    }

    setSelectedFile(file);
    selectedFileRef.current = file;
    setPdfBlob(null);
    setFileError("");
    setFileContentLoading(false);
  };

  const clearSelectedFile = (fileId: string) => {
    if (selectedFileRef.current?.fileId !== fileId) {
      return;
    }

    selectedFileRef.current = null;
    setSelectedFile(null);
    setPdfBlob(null);
    setFileError("");
    setFileContentLoading(false);
  };

  const handleDeleteFile = async (file: FileItem) => {
    try {
      await deleteFile(file.fileId);
      message.success(`“${file.originalName}”已删除。`);
      clearSelectedFile(file.fileId);
    } catch (reason) {
      const error = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "File 删除失败，请稍后重试。", {
          FILE_NOT_FOUND: "这个 File 已不存在，刷新列表后可同步最新状态。",
          FILE_IN_USE: "这个 File 仍被公告挂接，请先从所有公告中卸下。",
        }),
      );

      if (error.code === "FILE_NOT_FOUND" || error.code === "FILE_IN_USE") {
        refreshFiles();
      }
      if (error.code === "FILE_NOT_FOUND") {
        clearSelectedFile(file.fileId);
      }
      throw reason;
    }
  };

  const handleDeleteAnnouncement = async (
    announcement: AnnouncementListItem,
  ) => {
    try {
      await deleteAnnouncement(announcement.id);
      message.success(`公告“${announcement.name}”已删除。`);
      removeAnnouncement(announcement.id);
      refreshAnnouncements();
      refreshFiles();
    } catch (reason) {
      const error = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "公告删除失败，请稍后重试。", {
          ANNOUNCEMENT_NOT_FOUND: "这个公告已不存在，刷新列表后可同步最新状态。",
          ANNOUNCEMENT_JOB_RUNNING:
            "公告有正在运行的清理任务，请等待任务结束后再删除。",
        }),
      );

      if (error.code === "ANNOUNCEMENT_NOT_FOUND") {
        refreshAnnouncements();
        refreshFiles();
      } else if (error.code === "ANNOUNCEMENT_JOB_RUNNING") {
        refreshAnnouncements();
      }
      throw reason;
    }
  };

  const handleAnnouncementCreated = (announcement: AnnouncementDetail) => {
    applyAnnouncementDetail(announcement, { select: true });
    refreshAnnouncements();
  };

  const handleAnnouncementFilesChanged = (
    announcement: AnnouncementDetail,
  ) => {
    applyAnnouncementDetail(announcement);
    refreshAnnouncements();
    refreshFiles();
  };

  const handlePossibleServerStateChange = () => {
    refreshAnnouncements();
    refreshSelectedAnnouncement();
    refreshFiles();
  };

  const displayedFileError =
    selectedFile && !canPreviewSelectedFile
      ? "当前预览器仅支持 PDF；这个 File 仍可用于公告挂接或删除操作。"
      : fileError;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.statusRow}>
            <Tag className={styles.heroTag} color="cyan">
              公告与 File 管理
            </Tag>
            <span className={styles.reference}>
              {selectedAnnouncementId ?? "尚未选择公告"}
            </span>
          </div>
          <Typography.Title level={1} className={styles.pageTitle}>
            {selectedAnnouncement?.name ?? "招标公告管理"}
          </Typography.Title>
          <Typography.Paragraph className={styles.heroDescription}>
            上传 File、维护公告，并按 relativePath 管理公告中的挂接关系。
          </Typography.Paragraph>
        </div>
      </header>

      <div className={styles.contentGrid}>
        <main className={styles.mainColumn}>
          <SectionCard
            title="公告列表"
            description="公告列表由后端按最后修改时间降序返回。"
            extra={<CreateAnnouncement onCreated={handleAnnouncementCreated} />}
          >
            <AnnouncementList
              announcements={announcements}
              error={announcementsError}
              loading={announcementsLoading}
              selectedAnnouncementId={selectedAnnouncementId}
              onDelete={handleDeleteAnnouncement}
              onRetry={refreshAnnouncements}
              onSelect={(announcement) => selectAnnouncement(announcement.id)}
            />
          </SectionCard>

          <SectionCard
            title="File 列表"
            description="选择 File 后可预览 PDF 或挂接到当前公告。"
            extra={<UploadFile onUploaded={refreshFiles} />}
          >
            <div className={styles.fileSection}>
              <FileList
                refreshKey={fileListRefreshKey}
                selectedFileId={selectedFile?.fileId ?? null}
                onDeleteFile={handleDeleteFile}
                onSelectFile={handleSelectFile}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="公告挂接 File"
            description="relativePath 由后端校验；挂接和卸下后同步更新公告详情。"
          >
            <div className={styles.attachmentSection}>
              <AttachFile
                announcement={selectedAnnouncement}
                selectedFile={selectedFile}
                onAttached={handleAnnouncementFilesChanged}
                onFileMissing={clearSelectedFile}
                onStateMayHaveChanged={handlePossibleServerStateChange}
              />
              <Divider className={styles.innerDivider} />
              <AttachedFiles
                announcement={selectedAnnouncement}
                error={announcementDetailError}
                loading={announcementDetailLoading}
                onDetached={handleAnnouncementFilesChanged}
                onRetry={refreshSelectedAnnouncement}
                onStateMayHaveChanged={handlePossibleServerStateChange}
              />
            </div>
          </SectionCard>

          <SectionCard title="File 预览" description="当前仅预览 PDF File。">
            <div className={styles.fileSection}>
              {displayedFileError ? (
                <Alert
                  type="error"
                  showIcon
                  message={displayedFileError}
                  action={
                    canPreviewSelectedFile ? (
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
              <Spin spinning={fileContentLoading} tip="正在读取 File...">
                <PDF_viewer
                  key={`${selectedFile?.fileId ?? "no-pdf-selected"}:${
                    pdfBlob ? "loaded" : "empty"
                  }`}
                  pdfBlob={pdfBlob}
                  fileName={selectedFile?.originalName}
                />
              </Spin>
            </div>
          </SectionCard>
        </main>

        <div className={styles.reviewColumn}>
          <ReviewPanel />
        </div>
      </div>
    </div>
  );
}
