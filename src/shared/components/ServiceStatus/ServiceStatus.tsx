import { ApiOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Descriptions,
  Popover,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";

import {
  getServiceHealth,
  getServiceVersion,
  type ServiceHealth,
  type ServiceVersion,
} from "@/entities/System/systemStatus";
import { formatDateTime } from "@/shared/lib/format";

import styles from "./ServiceStatus.module.css";

const HEALTH_POLL_INTERVAL_MS = 30_000;

type VisibleStatus = "checking" | "healthy" | "degraded" | "offline";

const STATUS_META: Record<
  VisibleStatus,
  { label: string; className: string; tagColor: string }
> = {
  checking: {
    label: "检查服务",
    className: styles.checking,
    tagColor: "processing",
  },
  healthy: {
    label: "服务正常",
    className: styles.healthy,
    tagColor: "success",
  },
  degraded: {
    label: "Docling 异常",
    className: styles.degraded,
    tagColor: "warning",
  },
  offline: {
    label: "后端不可用",
    className: styles.offline,
    tagColor: "error",
  },
};

function getVisibleStatus(
  health: ServiceHealth | null,
  loading: boolean,
  failed: boolean,
): VisibleStatus {
  if (failed) return "offline";
  if (!health && loading) return "checking";
  if (health?.status === "UP" && health.docling.status === "UP") {
    return "healthy";
  }
  return health ? "degraded" : "offline";
}

export function ServiceStatus() {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [version, setVersion] = useState<ServiceVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthFailed, setHealthFailed] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let disposed = false;
    let activeController: AbortController | null = null;

    const loadHealth = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      setLoading(true);

      try {
        const result = await getServiceHealth(controller.signal);
        if (!disposed) {
          setHealth(result);
          setHealthFailed(false);
          setLastCheckedAt(new Date().toISOString());
        }
      } catch {
        if (!disposed && !controller.signal.aborted) {
          setHealth(null);
          setHealthFailed(true);
          setLastCheckedAt(new Date().toISOString());
        }
      } finally {
        if (!disposed && !controller.signal.aborted) setLoading(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadHealth();
    };

    void loadHealth();
    const intervalId = window.setInterval(
      () => void loadHealth(),
      HEALTH_POLL_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      activeController?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    void getServiceVersion(controller.signal)
      .then(setVersion)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const visibleStatus = getVisibleStatus(health, loading, healthFailed);
  const meta = STATUS_META[visibleStatus];
  const content = (
    <div className={styles.popoverContent}>
      <div className={styles.popoverHeading}>
        <span>
          <Typography.Text strong>服务状态</Typography.Text>
          <Typography.Text type="secondary">
            {lastCheckedAt
              ? `检查于 ${formatDateTime(lastCheckedAt)}`
              : "正在首次检查"}
          </Typography.Text>
        </span>
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          loading={loading}
          aria-label="重新检查服务状态"
          onClick={() => setReloadKey((value) => value + 1)}
        />
      </div>

      <Descriptions
        column={1}
        size="small"
        items={[
          {
            key: "backend",
            label: "后端",
            children: (
              <Tag color={healthFailed ? "error" : health ? "success" : "default"}>
                {healthFailed ? "无法连接" : health ? "已连接" : "检查中"}
              </Tag>
            ),
          },
          {
            key: "docling",
            label: "Docling",
            children: (
              <Tag color={health?.docling.status === "UP" ? "success" : "warning"}>
                {health?.docling.status ?? "未知"}
              </Tag>
            ),
          },
          {
            key: "doclingVersion",
            label: "Docling 版本",
            children: health?.docling.version ?? version?.docling ?? "未知",
          },
          {
            key: "application",
            label: "后端版本",
            children: version?.application ?? "未知",
          },
        ]}
      />

      {healthFailed ? (
        <Typography.Text type="danger">
          无法连接后端服务，请检查服务进程或 API 地址。
        </Typography.Text>
      ) : health?.docling.status === "DOWN" ? (
        <Typography.Text type="warning">
          后端可用，但文档清理依赖的 Docling 当前不可用。
        </Typography.Text>
      ) : null}
    </div>
  );

  return (
    <Popover content={content} placement="bottomRight" trigger="click">
      <Button
        className={styles.statusButton}
        type="text"
        aria-label={`服务状态：${meta.label}`}
      >
        <Space size={7}>
          <ApiOutlined />
          <span className={`${styles.statusDot} ${meta.className}`} />
          <span className={styles.statusLabel}>{meta.label}</span>
        </Space>
      </Button>
    </Popover>
  );
}
