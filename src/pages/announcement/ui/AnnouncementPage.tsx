import { App, Card, Tag, Typography } from "antd";

import { AnnouncementList } from "@/entities/Announcement/AnnouncementList";
import type {
  AnnouncementDetail,
  AnnouncementListItem,
} from "@/entities/Announcement/announcement";
import { AnnouncementWorkbench } from "@/features/AnnouncementWorkbench/ui/AnnouncementWorkbench";
import { CreateAnnouncement } from "@/features/Create-Announcement/ui/CreateAnnouncement";
import { deleteAnnouncement } from "@/features/Delete-Announcement/api/deleteAnnouncement";
import { useAnnouncementPage } from "@/pages/announcement/model/useAnnouncementPage";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";

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
          ANNOUNCEMENT_NOT_FOUND: "这个公告已不存在，正在刷新公告列表。",
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

  const handleAnnouncementUpdated = (announcement: AnnouncementDetail) => {
    applyAnnouncementDetail(announcement);
    refreshAnnouncements();
  };

  const handlePossibleServerStateChange = () => {
    refreshAnnouncements();
    refreshSelectedAnnouncement();
    refreshFiles();
  };

  return (
    <div className={styles.page}>
      <div className={styles.contentGrid}>
        <main className={styles.mainColumn}>
          <AnnouncementWorkbench
            key={selectedAnnouncementId ?? "no-announcement"}
            announcement={selectedAnnouncement}
            loading={
              announcementDetailLoading ||
              (!selectedAnnouncementId && announcementsLoading)
            }
            error={announcementDetailError}
            fileListRefreshKey={fileListRefreshKey}
            onAnnouncementUpdated={handleAnnouncementUpdated}
            onRefreshAnnouncement={refreshSelectedAnnouncement}
            onRefreshFiles={refreshFiles}
            onStateMayHaveChanged={handlePossibleServerStateChange}
          />
        </main>

        <aside className={styles.sidebar}>
          <Card className={styles.sidebarCard} variant="borderless">
            <div className={styles.sidebarHeading}>
              <div>
                <div className={styles.sidebarTitleRow}>
                  <Typography.Title level={2}>公告列表</Typography.Title>
                  <Tag>{announcements.length}</Tag>
                </div>
                <Typography.Paragraph>
                  选择公告后，在左侧工作台维护详情与子标包。
                </Typography.Paragraph>
              </div>
            </div>

            <div className={styles.createAction}>
              <CreateAnnouncement onCreated={handleAnnouncementCreated} />
            </div>

            <AnnouncementList
              announcements={announcements}
              error={announcementsError}
              loading={announcementsLoading}
              selectedAnnouncementId={selectedAnnouncementId}
              onDelete={handleDeleteAnnouncement}
              onRetry={refreshAnnouncements}
              onSelect={(announcement) => selectAnnouncement(announcement.id)}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}
