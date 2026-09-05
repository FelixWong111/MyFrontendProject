import {
  App,
  Card,
  Tag,
  Tabs,
  Typography,
} from "antd";
import { FileTextOutlined, ProductOutlined } from "@ant-design/icons";

import { AnnouncementList } from "@/entities/Announcement/AnnouncementList";
import type {
  AnnouncementDetail,
  AnnouncementListEntry,
} from "@/entities/Announcement/announcement";
import { AnnouncementWorkbench } from "@/features/AnnouncementWorkbench/ui/AnnouncementWorkbench";
import { CreateAnnouncement } from "@/features/Create-Announcement/ui/CreateAnnouncement";
import { deleteAnnouncement } from "@/features/Delete-Announcement/api/deleteAnnouncement";
import { ProductWorkbench } from "@/features/ProductWorkbench/ui/ProductWorkbench";
import { useAnnouncementPage } from "@/pages/announcement/model/useAnnouncementPage";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";

import styles from "./AnnouncementPage.module.css";

export function AnnouncementPage() {
  const { message } = App.useApp();
  const {
    announcements,
    announcementsLoading,
    announcementsError,
    announcementsTotal,
    announcementSearch,
    selectedAnnouncementId,
    selectedAnnouncement,
    announcementDetailLoading,
    announcementDetailError,
    fileListRefreshKey,
    selectAnnouncement,
    refreshAnnouncements,
    retryVisibleAnnouncements,
    runAnnouncementSearch,
    clearAnnouncementSearch,
    changeAnnouncementSearchPage,
    refreshSelectedAnnouncement,
    refreshFiles,
    applyAnnouncementDetail,
    removeAnnouncement,
  } = useAnnouncementPage();

  const handleDeleteAnnouncement = async (
    announcement: AnnouncementListEntry,
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
    clearAnnouncementSearch();
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
      <Tabs
        className={styles.workspaceTabs}
        defaultActiveKey="announcements"
        items={[
          {
            key: "announcements",
            label: (
              <span>
                <FileTextOutlined /> 公告工作台
              </span>
            ),
            children: (
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
                    onAnnouncementSnapshot={applyAnnouncementDetail}
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
                          <Tag>{announcementsTotal}</Tag>
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
                      key={announcementSearch.resetKey}
                      announcements={announcements}
                      error={announcementsError}
                      loading={announcementsLoading}
                      selectedAnnouncementId={selectedAnnouncementId}
                      searchActive={announcementSearch.active}
                      searchPage={announcementSearch.page}
                      searchSize={announcementSearch.size}
                      searchTotal={announcementSearch.total}
                      onClearSearch={clearAnnouncementSearch}
                      onDelete={handleDeleteAnnouncement}
                      onRetry={retryVisibleAnnouncements}
                      onSearch={runAnnouncementSearch}
                      onSearchPageChange={changeAnnouncementSearchPage}
                      onSelect={(announcement) => selectAnnouncement(announcement.id)}
                    />
                  </Card>
                </aside>
              </div>
            ),
          },
          {
            key: "products",
            label: (
              <span>
                <ProductOutlined /> 产品工作台
              </span>
            ),
            children: <ProductWorkbench />,
          },
        ]}
      />
    </div>
  );
}
