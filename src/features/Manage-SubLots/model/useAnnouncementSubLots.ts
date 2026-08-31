import { useCallback, useEffect, useRef, useState } from "react";

import { listSubLots, type SubLot } from "@/entities/SubLot/subLot";
import { getApiErrorMessage } from "@/shared/api/apiError";

export function useAnnouncementSubLots(announcementId: string) {
  const [subLots, setSubLots] = useState<SubLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    const requestGeneration = ++requestGenerationRef.current;

    let disposed = false;

    const loadSubLots = async () => {
      setSubLots([]);
      setError("");
      setLoading(true);

      try {
        const result = await listSubLots(announcementId);
        if (
          !disposed &&
          requestGenerationRef.current === requestGeneration
        ) {
          setSubLots(result);
        }
      } catch (reason) {
        if (
          !disposed &&
          requestGenerationRef.current === requestGeneration
        ) {
          setError(
            getApiErrorMessage(reason, "子标包加载失败，请稍后重试。", {
              ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新公告列表。",
            }),
          );
        }
      } finally {
        if (
          !disposed &&
          requestGenerationRef.current === requestGeneration
        ) {
          setLoading(false);
        }
      }
    };

    void loadSubLots();

    return () => {
      disposed = true;
    };
  }, [announcementId, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const applySubLot = useCallback((subLot: SubLot) => {
    setSubLots((current) => {
      const existingIndex = current.findIndex((item) => item.id === subLot.id);
      if (existingIndex === -1) {
        return [...current, subLot];
      }

      return current.map((item) => (item.id === subLot.id ? subLot : item));
    });
  }, []);

  const removeSubLot = useCallback((subLotId: string) => {
    setSubLots((current) => current.filter((item) => item.id !== subLotId));
  }, []);

  return {
    subLots,
    loading,
    error,
    refresh,
    applySubLot,
    removeSubLot,
  };
}
