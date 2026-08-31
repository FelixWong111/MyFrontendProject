import { useCallback, useEffect, useRef, useState } from "react";

import {
  getAnnouncementDetail,
  listAnnouncements,
  type AnnouncementDetail,
  type AnnouncementListItem,
} from "@/entities/Announcement/announcement";
import { getApiError, getApiErrorMessage } from "@/shared/api/apiError";

interface ApplyAnnouncementDetailOptions {
  select?: boolean;
}

export function useAnnouncementPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>(
    [],
  );
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState("");
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<
    string | null
  >(null);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<AnnouncementDetail | null>(null);
  const [announcementDetailLoading, setAnnouncementDetailLoading] =
    useState(false);
  const [announcementDetailError, setAnnouncementDetailError] = useState("");
  const [announcementListRefreshKey, setAnnouncementListRefreshKey] =
    useState(0);
  const [announcementDetailRefreshKey, setAnnouncementDetailRefreshKey] =
    useState(0);
  const [fileListRefreshKey, setFileListRefreshKey] = useState(0);
  const selectedAnnouncementIdRef = useRef<string | null>(null);
  const detailRequestGenerationRef = useRef(0);

  useEffect(() => {
    let disposed = false;

    const loadAnnouncements = async () => {
      setAnnouncementsLoading(true);
      setAnnouncementsError("");

      try {
        const result = await listAnnouncements();

        if (disposed) {
          return;
        }

        setAnnouncements(result.announcements);

        const currentId = selectedAnnouncementIdRef.current;
        const nextId =
          currentId &&
          result.announcements.some(
            (announcement) => announcement.id === currentId,
          )
            ? currentId
            : (result.announcements[0]?.id ?? null);

        selectedAnnouncementIdRef.current = nextId;
        setSelectedAnnouncementId(nextId);
      } catch (reason) {
        if (!disposed) {
          setAnnouncementsError(
            getApiErrorMessage(
              reason,
              "公告列表加载失败，请检查后端服务后重试。",
            ),
          );
        }
      } finally {
        if (!disposed) {
          setAnnouncementsLoading(false);
        }
      }
    };

    void loadAnnouncements();

    return () => {
      disposed = true;
    };
  }, [announcementListRefreshKey]);

  useEffect(() => {
    if (!selectedAnnouncementId) {
      return;
    }

    let disposed = false;
    const requestGeneration = ++detailRequestGenerationRef.current;

    const loadAnnouncementDetail = async () => {
      setAnnouncementDetailLoading(true);
      setAnnouncementDetailError("");
      setSelectedAnnouncement((current) =>
        current?.id === selectedAnnouncementId ? current : null,
      );

      try {
        const detail = await getAnnouncementDetail(selectedAnnouncementId);
        if (
          !disposed &&
          detailRequestGenerationRef.current === requestGeneration &&
          selectedAnnouncementIdRef.current === selectedAnnouncementId
        ) {
          setSelectedAnnouncement(detail);
        }
      } catch (reason) {
        if (
          !disposed &&
          detailRequestGenerationRef.current === requestGeneration &&
          selectedAnnouncementIdRef.current === selectedAnnouncementId
        ) {
          const error = getApiError(reason);
          setAnnouncementDetailError(
            getApiErrorMessage(reason, "公告详情加载失败，请稍后重试。", {
              ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新公告列表。",
            }),
          );

          if (error.code === "ANNOUNCEMENT_NOT_FOUND") {
            setSelectedAnnouncement(null);
            setAnnouncementListRefreshKey((value) => value + 1);
          }
        }
      } finally {
        if (
          !disposed &&
          detailRequestGenerationRef.current === requestGeneration &&
          selectedAnnouncementIdRef.current === selectedAnnouncementId
        ) {
          setAnnouncementDetailLoading(false);
        }
      }
    };

    void loadAnnouncementDetail();

    return () => {
      disposed = true;
    };
  }, [announcementDetailRefreshKey, selectedAnnouncementId]);

  const selectAnnouncement = useCallback((announcementId: string) => {
    selectedAnnouncementIdRef.current = announcementId;
    setSelectedAnnouncementId(announcementId);
  }, []);

  const refreshAnnouncements = useCallback(() => {
    setAnnouncementListRefreshKey((value) => value + 1);
  }, []);

  const refreshSelectedAnnouncement = useCallback(() => {
    setAnnouncementDetailRefreshKey((value) => value + 1);
  }, []);

  const refreshFiles = useCallback(() => {
    setFileListRefreshKey((value) => value + 1);
  }, []);

  const applyAnnouncementDetail = useCallback(
    (
      detail: AnnouncementDetail,
      options: ApplyAnnouncementDetailOptions = {},
    ) => {
      const listItem: AnnouncementListItem = {
        id: detail.id,
        name: detail.name,
        lastModifiedTime: detail.lastModifiedTime,
        fileCount: detail.files.length,
        lastGeneratedCleanedAnnouncementTime:
          detail.lastGeneratedCleanedAnnouncementTime,
        lastJobId: detail.lastJobId,
      };

      const shouldUpdateSelection =
        options.select || selectedAnnouncementIdRef.current === detail.id;

      if (options.select) {
        selectedAnnouncementIdRef.current = detail.id;
        setSelectedAnnouncementId(detail.id);
      }

      if (shouldUpdateSelection) {
        detailRequestGenerationRef.current += 1;
        setSelectedAnnouncement(detail);
        setAnnouncementDetailError("");
        setAnnouncementDetailLoading(false);
      }

      setAnnouncements((current) =>
        [listItem, ...current.filter((item) => item.id !== detail.id)].sort(
          (left, right) =>
            right.lastModifiedTime.localeCompare(left.lastModifiedTime),
        ),
      );
    },
    [],
  );

  const removeAnnouncement = useCallback((announcementId: string) => {
    setAnnouncements((current) =>
      current.filter((announcement) => announcement.id !== announcementId),
    );
    if (selectedAnnouncementIdRef.current === announcementId) {
      selectedAnnouncementIdRef.current = null;
      detailRequestGenerationRef.current += 1;
      setSelectedAnnouncementId(null);
      setSelectedAnnouncement(null);
      setAnnouncementDetailError("");
      setAnnouncementDetailLoading(false);
    }
  }, []);

  const visibleSelectedAnnouncement =
    selectedAnnouncement?.id === selectedAnnouncementId
      ? selectedAnnouncement
      : null;

  return {
    announcements,
    announcementsLoading,
    announcementsError,
    selectedAnnouncementId,
    selectedAnnouncement: visibleSelectedAnnouncement,
    announcementDetailLoading: selectedAnnouncementId
      ? announcementDetailLoading
      : false,
    announcementDetailError: selectedAnnouncementId
      ? announcementDetailError
      : "",
    fileListRefreshKey,
    selectAnnouncement,
    refreshAnnouncements,
    refreshSelectedAnnouncement,
    refreshFiles,
    applyAnnouncementDetail,
    removeAnnouncement,
  };
}
