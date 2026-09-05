import {
  ClockCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";

import {
  listRunningJobs,
  type RunningJobSummary,
} from "@/entities/Job/runningJobs";
import { formatDateTime } from "@/shared/lib/format";

import styles from "./TaskCenter.module.css";

const CLOSED_POLL_INTERVAL_MS = 15_000;
const OPEN_POLL_INTERVAL_MS = 3_000;

const PHASE_LABELS: Readonly<Record<string, string>> = {
  DISCOVERING: "发现输入文件",
  ANALYZING_FILENAMES: "分析文件名",
  DEDUPLICATING: "文件去重",
  CONVERTING: "转换文件",
  FILTERING: "过滤内容",
  ASSEMBLING: "生成清理结果",
  RESUMING: "恢复任务",
  DONE: "任务完成",
};

function getPhaseLabel(phase: string | null): string {
  if (!phase) return "等待阶段更新";
  return PHASE_LABELS[phase] ?? phase;
}

export function TaskCenter() {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<RunningJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let disposed = false;
    let activeController: AbortController | null = null;

    const loadJobs = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      setLoading(true);

      try {
        const result = await listRunningJobs(controller.signal);
        if (!disposed) {
          setJobs(result);
          setError("");
          setLastUpdatedAt(new Date().toISOString());
        }
      } catch {
        if (!disposed && !controller.signal.aborted) {
          setError("运行任务读取失败，请检查后端服务后重试。");
        }
      } finally {
        if (!disposed && !controller.signal.aborted) setLoading(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadJobs();
    };

    void loadJobs();
    const intervalId = window.setInterval(
      () => void loadJobs(),
      open ? OPEN_POLL_INTERVAL_MS : CLOSED_POLL_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      activeController?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [open, reloadKey]);

  return (
    <>
      <Badge
        count={jobs.length}
        overflowCount={99}
        size="small"
        offset={[-2, 3]}
      >
        <Button
          className={styles.trigger}
          type="text"
          icon={<SyncOutlined spin={jobs.length > 0} />}
          aria-label={`运行任务中心，当前 ${jobs.length} 个任务`}
          onClick={() => setOpen(true)}
        >
          <span className={styles.triggerLabel}>运行任务</span>
        </Button>
      </Badge>

      <Drawer
        open={open}
        title="运行任务中心"
        width={560}
        onClose={() => setOpen(false)}
        extra={
          <Button
            type="text"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => setReloadKey((value) => value + 1)}
          >
            刷新
          </Button>
        }
      >
        <div className={styles.drawerContent}>
          <div className={styles.summary}>
            <span>
              <Typography.Text strong>
                当前运行 {jobs.length} 个任务
              </Typography.Text>
              <Typography.Text type="secondary">
                这里只显示本进程中的等待和运行任务，结束后会自动移出。
              </Typography.Text>
            </span>
            {lastUpdatedAt ? (
              <Typography.Text type="secondary">
                更新于 {formatDateTime(lastUpdatedAt)}
              </Typography.Text>
            ) : null}
          </div>

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

          <Spin spinning={loading && jobs.length === 0}>
            <List<RunningJobSummary>
              className={styles.jobList}
              dataSource={jobs}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="当前没有运行中的清理任务"
                  />
                ),
              }}
              renderItem={(job) => (
                <List.Item className={styles.jobItem}>
                  <div className={styles.jobCard}>
                    <div className={styles.jobHeading}>
                      <span>
                        <Typography.Text strong ellipsis>
                          {job.announcementName}
                        </Typography.Text>
                        <Typography.Text
                          copyable={{ text: job.jobId }}
                          type="secondary"
                          ellipsis
                        >
                          {job.jobId}
                        </Typography.Text>
                      </span>
                      <Space size={5} wrap>
                        <Tag color={job.kind === "RESUME" ? "purple" : "cyan"}>
                          {job.kind === "RESUME" ? "恢复" : "清理"}
                        </Tag>
                        <Tag color="processing">
                          {job.status === "CREATED" ? "等待执行" : "运行中"}
                        </Tag>
                      </Space>
                    </div>

                    <div className={styles.phaseRow}>
                      <SyncOutlined spin={job.status === "RUNNING"} />
                      <span>
                        <strong>{getPhaseLabel(job.phase)}</strong>
                        <small>{job.message ?? "等待进度消息"}</small>
                      </span>
                    </div>

                    <div className={styles.jobMeta}>
                      <span title={job.announcementId}>
                        公告：{job.announcementId}
                      </span>
                      <span>
                        <ClockCircleOutlined /> {formatDateTime(job.updatedAt)}
                      </span>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Spin>
        </div>
      </Drawer>
    </>
  );
}
