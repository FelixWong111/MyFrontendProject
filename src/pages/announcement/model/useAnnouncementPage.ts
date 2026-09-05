import { useCallback, useEffect, useRef, useState } from "react";

import {
  getAnnouncementDetail,
  listAnnouncements,
  searchAnnouncements,
  type AnnouncementDetail,
  type AnnouncementListItem,
  type AnnouncementSearchParams,
  type AnnouncementSearchResult,
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
  const [announcementSearchParams, setAnnouncementSearchParams] =
    useState<AnnouncementSearchParams | null>(null);
  const [announcementSearchResults, setAnnouncementSearchResults] = useState<
    AnnouncementSearchResult[]
  >([]);
  const [announcementSearchTotal, setAnnouncementSearchTotal] = useState(0);
  const [announcementSearchLoading, setAnnouncementSearchLoading] =
    useState(false);
  const [announcementSearchError, setAnnouncementSearchError] = useState("");
  const [announcementSearchResetKey, setAnnouncementSearchResetKey] =
    useState(0);
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
  const [announcementSearchRefreshKey, setAnnouncementSearchRefreshKey] =
    useState(0);
  const [announcementDetailRefreshKey, setAnnouncementDetailRefreshKey] =
    useState(0);
  const [fileListRefreshKey, setFileListRefreshKey] = useState(0);
  const selectedAnnouncementIdRef = useRef<string | null>(null);
  const detailRequestGenerationRef = useRef(0);
  const announcementSearchActiveRef = useRef(false);

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

        if (announcementSearchActiveRef.current) {
          return;
        }

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
    if (!announcementSearchParams) {
      return;
    }

    let disposed = false;
    const controller = new AbortController();

    const loadAnnouncementSearchResults = async () => {
      setAnnouncementSearchLoading(true);
      setAnnouncementSearchError("");

      try {
        const result = await searchAnnouncements(
          announcementSearchParams,
          controller.signal,
        );

        if (!disposed) {
          const requestedPage = announcementSearchParams.page ?? 1;
          const lastPage = Math.max(1, Math.ceil(result.total / result.size));

          if (requestedPage > lastPage) {
            setAnnouncementSearchResults([]);
            setAnnouncementSearchTotal(result.total);
            setAnnouncementSearchParams((current) =>
              current ? { ...current, page: lastPage } : current,
            );
            return;
          }

          setAnnouncementSearchResults(result.results);
          setAnnouncementSearchTotal(result.total);
        }
      } catch (reason) {
        if (!disposed) {
          setAnnouncementSearchError(
            getApiErrorMessage(reason, "公告查询失败，请稍后重试。", {
              INVALID_REQUEST: "查询条件无效，请检查关键词、日期和分页。",
            }),
          );
        }
      } finally {
        if (!disposed) {
          setAnnouncementSearchLoading(false);
        }
      }
    };

    void loadAnnouncementSearchResults();

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [announcementSearchParams, announcementSearchRefreshKey]);

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
              DETAIL_NOT_FOUND:
                "这个存量公告缺少详情数据，请联系后端完成数据迁移。",
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
    setAnnouncementSearchRefreshKey((value) => value + 1);
  }, []);

  const retryVisibleAnnouncements = useCallback(() => {
    if (announcementSearchParams) {
      setAnnouncementSearchLoading(true);
      setAnnouncementSearchRefreshKey((value) => value + 1);
    } else {
      setAnnouncementListRefreshKey((value) => value + 1);
    }
  }, [announcementSearchParams]);

  const runAnnouncementSearch = useCallback(
    (params: AnnouncementSearchParams) => {
      announcementSearchActiveRef.current = true;
      setAnnouncementSearchResults([]);
      setAnnouncementSearchTotal(0);
      setAnnouncementSearchError("");
      setAnnouncementSearchLoading(true);
      setAnnouncementSearchParams({
        ...params,
        page: 1,
        size: 20,
      });
    },
    [],
  );

  const clearAnnouncementSearch = useCallback(() => {
    announcementSearchActiveRef.current = false;
    setAnnouncementSearchParams(null);
    setAnnouncementSearchResults([]);
    setAnnouncementSearchTotal(0);
    setAnnouncementSearchError("");
    setAnnouncementSearchLoading(false);
    setAnnouncementSearchResetKey((value) => value + 1);

    if (!selectedAnnouncementIdRef.current) {
      const nextId = announcements[0]?.id ?? null;
      selectedAnnouncementIdRef.current = nextId;
      setSelectedAnnouncementId(nextId);
    }
  }, [announcements]);

  const changeAnnouncementSearchPage = useCallback((page: number) => {
    setAnnouncementSearchResults([]);
    setAnnouncementSearchError("");
    setAnnouncementSearchLoading(true);
    setAnnouncementSearchParams((current) =>
      current ? { ...current, page } : current,
    );
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
        lastExtractionStatus: detail.lastExtractionStatus,
        lastExtractedAt: detail.lastExtractedAt,
        lastExtractionError: detail.lastExtractionError,
        lastMatchStatus: detail.lastMatchStatus,
        lastMatchedAt: detail.lastMatchedAt,
        lastMatchError: detail.lastMatchError,
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
      setAnnouncementSearchResults((current) =>
        current.map((result) =>
          result.id === detail.id
            ? {
                ...result,
                name: detail.name,
                lastModifiedTime: detail.lastModifiedTime,
                lastGeneratedCleanedAnnouncementTime:
                  detail.lastGeneratedCleanedAnnouncementTime,
                lastJobId: detail.lastJobId,
                lastExtractionStatus: detail.lastExtractionStatus,
                lastExtractedAt: detail.lastExtractedAt,
                lastExtractionError: detail.lastExtractionError,
                lastMatchStatus: detail.lastMatchStatus,
                lastMatchedAt: detail.lastMatchedAt,
                lastMatchError: detail.lastMatchError,
              }
            : result,
        ),
      );
    },
    [],
  );

  const removeAnnouncement = useCallback((announcementId: string) => {
    setAnnouncements((current) =>
      current.filter((announcement) => announcement.id !== announcementId),
    );
    setAnnouncementSearchResults((current) =>
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

  const announcementSearchActive = announcementSearchParams !== null;
  const visibleAnnouncements = announcementSearchActive
    ? announcementSearchResults
    : announcements;

  return {
    announcements: visibleAnnouncements,
    announcementsLoading: announcementSearchActive
      ? announcementSearchLoading
      : announcementsLoading,
    announcementsError: announcementSearchActive
      ? announcementSearchError
      : announcementsError,
    announcementsTotal: announcementSearchActive
      ? announcementSearchTotal
      : announcements.length,
    announcementSearch: {
      active: announcementSearchActive,
      page: announcementSearchParams?.page ?? 1,
      size: announcementSearchParams?.size ?? 20,
      total: announcementSearchTotal,
      resetKey: announcementSearchResetKey,
    },
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
    retryVisibleAnnouncements,
    runAnnouncementSearch,
    clearAnnouncementSearch,
    changeAnnouncementSearchPage,
    refreshSelectedAnnouncement,
    refreshFiles,
    applyAnnouncementDetail,
    removeAnnouncement,
  };
}
