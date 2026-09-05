import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeploymentUnitOutlined,
  FileSearchOutlined,
  RedoOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Progress,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getAnnouncementDetail,
  type AnnouncementDetail,
  type AsyncOperationStatus,
} from "@/entities/Announcement/announcement";
import {
  cleanAnnouncement,
  extractAnnouncement,
  getAnnouncementMatchResult,
  getCleanJob,
  matchAnnouncement,
  resumeAnnouncement,
  type AnnouncementMatchResult,
  type CleanJob,
  type CleanJobAccepted,
  type CleanJobStatus,
} from "@/features/Process-Announcement/api/announcementProcessing";
import {
  getApiError,
  getApiErrorMessage,
} from "@/shared/api/apiError";
import { formatDateTime } from "@/shared/lib/format";

import styles from "./AnnouncementProcessingWorkspace.module.css";

interface AnnouncementProcessingWorkspaceProps {
  announcement: AnnouncementDetail;
  onAnnouncementSnapshot: (announcement: AnnouncementDetail) => void;
  onStateMayHaveChanged: () => void;
}

type RunningAction = "clean" | "resume" | "extract" | "match" | null;
type VisibleCleanJob = CleanJob | CleanJobAccepted;

const POLL_INTERVAL_MS = 2_500;

const ASYNC_STATUS_META: Record<
  AsyncOperationStatus,
  { label: string; color: string }
> = {
  RUNNING: { label: "进行中", color: "processing" },
  SUCCESS: { label: "成功", color: "success" },
  FAILED: { label: "失败", color: "error" },
};

const CLEAN_STATUS_META: Record<
  CleanJobStatus,
  { label: string; color: string }
> = {
  CREATED: { label: "等待执行", color: "default" },
  RUNNING: { label: "正在清理", color: "processing" },
  COMPLETED: { label: "清理完成", color: "success" },
  COMPLETED_WITH_ERRORS: { label: "部分完成", color: "warning" },
  FAILED: { label: "清理失败", color: "error" },
};

function isJobRunning(status: CleanJobStatus | undefined): boolean {
  return status === "CREATED" || status === "RUNNING";
}

function formatOptionalTime(value: string | null): string {
  return value ? formatDateTime(value) : "暂无";
}

export function AnnouncementProcessingWorkspace({
  announcement,
  onAnnouncementSnapshot,
  onStateMayHaveChanged,
}: AnnouncementProcessingWorkspaceProps) {
  const { message } = App.useApp();
  const [action, setAction] = useState<RunningAction>(null);
  const [job, setJob] = useState<VisibleCleanJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState("");
  const [jobUnavailable, setJobUnavailable] = useState(false);
  const [matchResult, setMatchResult] =
    useState<AnnouncementMatchResult | null>(null);
  const [matchResultLoading, setMatchResultLoading] = useState(false);
  const [matchResultError, setMatchResultError] = useState("");
  const [pollingRequested, setPollingRequested] = useState(false);
  const quietPollCountRef = useRef(0);

  const refreshAnnouncementSnapshot = useCallback(async () => {
    const freshAnnouncement = await getAnnouncementDetail(announcement.id);
    onAnnouncementSnapshot(freshAnnouncement);
    return freshAnnouncement;
  }, [announcement.id, onAnnouncementSnapshot]);

  const loadJob = useCallback(async (jobId: string) => {
    setJobLoading(true);
    setJobError("");
    setJobUnavailable(false);

    try {
      const latestJob = await getCleanJob(jobId);
      setJob(latestJob);
      return latestJob;
    } catch (reason) {
      const apiError = getApiError(reason);
      if (apiError.status === 404) {
        setJob(null);
        setJobUnavailable(true);
        return null;
      }

      setJobError(
        getApiErrorMessage(reason, "清理任务状态读取失败，请稍后重试。"),
      );
      return null;
    } finally {
      setJobLoading(false);
    }
  }, []);

  const loadMatchResult = useCallback(async () => {
    if (!announcement.lastMatchedAt) {
      setMatchResult(null);
      setMatchResultError("");
      return;
    }

    setMatchResultLoading(true);
    setMatchResultError("");
    try {
      setMatchResult(await getAnnouncementMatchResult(announcement.id));
    } catch (reason) {
      const apiError = getApiError(reason);
      if (apiError.code === "MATCH_RESULT_NOT_FOUND") {
        setMatchResult(null);
      } else {
        setMatchResultError(
          getApiErrorMessage(reason, "匹配结果读取失败，请稍后重试。"),
        );
      }
    } finally {
      setMatchResultLoading(false);
    }
  }, [announcement.id, announcement.lastMatchedAt]);

  useEffect(() => {
    if (!announcement.lastJobId) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => void loadJob(announcement.lastJobId!),
      0,
    );
    return () => window.clearTimeout(timeoutId);
  }, [announcement.lastJobId, loadJob]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadMatchResult(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadMatchResult]);

  const statusIsRunning =
    isJobRunning(job?.status) ||
    announcement.lastExtractionStatus === "RUNNING" ||
    announcement.lastMatchStatus === "RUNNING";

  useEffect(() => {
    if (!pollingRequested && !statusIsRunning) {
      return;
    }

    let disposed = false;
    let timeoutId: number | undefined;

    const poll = async () => {
      try {
        const freshAnnouncement = await getAnnouncementDetail(announcement.id);
        if (disposed) return;

        onAnnouncementSnapshot(freshAnnouncement);
        let stillRunning =
          freshAnnouncement.lastExtractionStatus === "RUNNING" ||
          freshAnnouncement.lastMatchStatus === "RUNNING";

        if (freshAnnouncement.lastJobId) {
          try {
            const latestJob = await getCleanJob(freshAnnouncement.lastJobId);
            if (disposed) return;
            setJob(latestJob);
            setJobError("");
            setJobUnavailable(false);
            stillRunning = stillRunning || isJobRunning(latestJob.status);
          } catch (reason) {
            if (disposed) return;
            const apiError = getApiError(reason);
            if (apiError.status === 404) {
              setJob(null);
              setJobUnavailable(true);
            } else {
              setJobError(
                getApiErrorMessage(
                  reason,
                  "清理任务状态读取失败，请稍后重试。",
                ),
              );
            }
          }
        }

        if (stillRunning) {
          quietPollCountRef.current = 0;
        } else {
          quietPollCountRef.current += 1;
        }

        if (!stillRunning && quietPollCountRef.current >= 3) {
          setPollingRequested(false);
          return;
        }
      } catch {
        // 短暂网络波动不终止轮询，页面上的手动刷新仍可恢复状态。
      }

      if (!disposed) {
        timeoutId = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };

    timeoutId = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [
    announcement.id,
    announcement.lastExtractionStatus,
    announcement.lastMatchStatus,
    job?.status,
    onAnnouncementSnapshot,
    pollingRequested,
    statusIsRunning,
  ]);

  const beginPolling = () => {
    quietPollCountRef.current = 0;
    setPollingRequested(true);
  };

  const handleClean = async () => {
    if (action) return;
    setAction("clean");

    try {
      const acceptedJob = await cleanAnnouncement(announcement.id);
      setJob(acceptedJob);
      setJobError("");
      setJobUnavailable(false);
      beginPolling();
      await refreshAnnouncementSnapshot();
      message.success("清理任务已提交，完成后将自动提取并匹配产品。");
    } catch (reason) {
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "清理任务提交失败，请稍后重试。", {
          ANNOUNCEMENT_EMPTY: "请先为公告挂接至少一个文件。",
          ANNOUNCEMENT_JOB_RUNNING: "当前公告已有正在运行的清理任务。",
          ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新列表。",
          JOB_QUEUE_FULL: "清理任务队列已满，请稍后重试。",
          SERVER_SHUTTING_DOWN: "服务正在关闭，暂时不能提交任务。",
        }),
      );
      if (
        apiError.code === "ANNOUNCEMENT_NOT_FOUND" ||
        apiError.code === "ANNOUNCEMENT_JOB_RUNNING"
      ) {
        onStateMayHaveChanged();
      }
    } finally {
      setAction(null);
    }
  };

  const handleExtract = async () => {
    if (action) return;
    setAction("extract");

    try {
      await extractAnnouncement(announcement.id);
      beginPolling();
      await refreshAnnouncementSnapshot();
      message.success("信息提取任务已提交。");
    } catch (reason) {
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "信息提取提交失败，请稍后重试。", {
          EXTRACTION_DISABLED: "后端未启用信息提取功能。",
          NO_SUCCESSFUL_CLEAN_JOB: "请先完成一次公告清理。",
          ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新列表。",
          SERVER_SHUTTING_DOWN: "服务正在关闭，暂时不能提交任务。",
        }),
      );
      if (apiError.code === "ANNOUNCEMENT_NOT_FOUND") {
        onStateMayHaveChanged();
      }
    } finally {
      setAction(null);
    }
  };

  const handleResume = async () => {
    if (action) return;
    setAction("resume");

    try {
      const acceptedJob = await resumeAnnouncement(announcement.id);
      setJob(acceptedJob);
      setJobError("");
      setJobUnavailable(false);
      beginPolling();
      await refreshAnnouncementSnapshot();
      message.success("清理恢复任务已提交。");
    } catch (reason) {
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "清理恢复提交失败，请稍后重试。", {
          NO_RESUMABLE_JOB: "没有可恢复的清理任务，请重新运行清理。",
          ANNOUNCEMENT_JOB_RUNNING: "当前公告已有正在运行的清理任务。",
          JOB_ALREADY_RUNNING: "该清理任务已经在运行。",
          ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新列表。",
          JOB_QUEUE_FULL: "清理任务队列已满，请稍后重试。",
          SERVER_SHUTTING_DOWN: "服务正在关闭，暂时不能提交任务。",
        }),
      );
      if (
        apiError.code === "ANNOUNCEMENT_NOT_FOUND" ||
        apiError.code === "ANNOUNCEMENT_JOB_RUNNING" ||
        apiError.code === "JOB_ALREADY_RUNNING"
      ) {
        onStateMayHaveChanged();
      }
    } finally {
      setAction(null);
    }
  };

  const handleMatch = async () => {
    if (action) return;
    setAction("match");

    try {
      await matchAnnouncement(announcement.id);
      beginPolling();
      await refreshAnnouncementSnapshot();
      message.success("产品匹配任务已提交。");
    } catch (reason) {
      const apiError = getApiError(reason);
      message.error(
        getApiErrorMessage(reason, "产品匹配提交失败，请稍后重试。", {
          MATCHING_DISABLED: "后端未启用产品匹配功能。",
          NO_PRODUCTS: "产品目录为空，请先在产品工作台新增产品。",
          ANNOUNCEMENT_NOT_FOUND: "当前公告已不存在，请刷新列表。",
          SERVER_SHUTTING_DOWN: "服务正在关闭，暂时不能提交任务。",
        }),
      );
      if (apiError.code === "ANNOUNCEMENT_NOT_FOUND") {
        onStateMayHaveChanged();
      }
    } finally {
      setAction(null);
    }
  };

  const cleanStatus = job?.status;
  const cleanMeta = cleanStatus ? CLEAN_STATUS_META[cleanStatus] : null;
  const fullJob = job && "progress" in job ? job : null;
  const cleanProgress = fullJob?.progress;
  const canResume =
    cleanStatus === "FAILED" || cleanStatus === "COMPLETED_WITH_ERRORS";
  const progressPercent = cleanProgress?.phaseCount
    ? Math.min(
        100,
        Math.round((cleanProgress.phaseIndex / cleanProgress.phaseCount) * 100),
      )
    : cleanStatus === "COMPLETED" || cleanStatus === "COMPLETED_WITH_ERRORS"
      ? 100
      : 0;

  return (
    <div className={styles.workspace}>
      <Alert
        type="info"
        showIcon
        message="自动处理链路"
        description="手动清理完成后会自动提取公告信息；提取成功后会自动匹配产品。三个步骤也可以分别手动触发。"
      />

      <div className={styles.statusGrid}>
        <StatusCard
          title="文件清理"
          status={
            cleanMeta ? (
              <Tag color={cleanMeta.color}>{cleanMeta.label}</Tag>
            ) : announcement.lastGeneratedCleanedAnnouncementTime ? (
              <Tag color="success">已有清理结果</Tag>
            ) : announcement.lastJobId ? (
              <Tag>状态不可查询</Tag>
            ) : (
              <Tag>未运行</Tag>
            )
          }
          timeLabel="最近成功"
          time={formatOptionalTime(
            announcement.lastGeneratedCleanedAnnouncementTime,
          )}
          error={fullJob?.error?.message ?? jobError}
          action={
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={action === "clean"}
              disabled={
                Boolean(action) ||
                isJobRunning(cleanStatus) ||
                announcement.files.length === 0
              }
              onClick={() => void handleClean()}
            >
              手动清洗
            </Button>
          }
        />

        <StatusCard
          title="信息提取"
          status={<AsyncStatusTag status={announcement.lastExtractionStatus} />}
          timeLabel="最近成功"
          time={formatOptionalTime(announcement.lastExtractedAt)}
          error={announcement.lastExtractionError}
          action={
            <Button
              icon={<FileSearchOutlined />}
              loading={action === "extract"}
              disabled={
                Boolean(action) ||
                isJobRunning(cleanStatus) ||
                !announcement.lastGeneratedCleanedAnnouncementTime ||
                announcement.lastExtractionStatus === "RUNNING"
              }
              onClick={() => void handleExtract()}
            >
              手动提取
            </Button>
          }
        />

        <StatusCard
          title="产品匹配"
          status={<AsyncStatusTag status={announcement.lastMatchStatus} />}
          timeLabel="最近成功"
          time={formatOptionalTime(announcement.lastMatchedAt)}
          error={announcement.lastMatchError}
          action={
            <Button
              icon={<DeploymentUnitOutlined />}
              loading={action === "match"}
              disabled={
                Boolean(action) ||
                isJobRunning(cleanStatus) ||
                announcement.lastExtractionStatus === "RUNNING" ||
                announcement.lastMatchStatus === "RUNNING"
              }
              onClick={() => void handleMatch()}
            >
              手动匹配
            </Button>
          }
        />
      </div>

      {announcement.lastJobId ? (
        <Card
          size="small"
          className={styles.progressCard}
          title="清理任务进度"
          extra={
            <Typography.Text copyable={{ text: announcement.lastJobId }} code>
              {announcement.lastJobId}
            </Typography.Text>
          }
        >
          <Spin spinning={jobLoading && !job}>
            {jobUnavailable ? (
              <Alert
                type="warning"
                showIcon
                message="服务重启后无法查询该任务的实时详情"
                description="最近成功清理时间仍以公告字段为准，你可以重新提交一次清理。"
              />
            ) : fullJob ? (
              <div className={styles.progressContent}>
                <div className={styles.progressHeading}>
                  <span>
                    <strong>{fullJob.phase ?? "等待阶段更新"}</strong>
                    <small>{fullJob.message ?? "任务状态已更新"}</small>
                  </span>
                  <Tag color={cleanMeta?.color}>{cleanMeta?.label}</Tag>
                </div>
                <Progress
                  percent={progressPercent}
                  status={cleanStatus === "FAILED" ? "exception" : undefined}
                />
                {cleanProgress ? (
                  <div className={styles.fileStats}>
                    <span>文件总数 {cleanProgress.files.total}</span>
                    <span>已完成 {cleanProgress.files.completed}</span>
                    <span>处理中 {cleanProgress.files.running}</span>
                    <span>失败 {cleanProgress.files.failed}</span>
                  </div>
                ) : null}
                {canResume ? (
                  <Alert
                    className={styles.resumeAlert}
                    type="warning"
                    showIcon
                    message={
                      cleanStatus === "FAILED"
                        ? "这个清理任务失败，可以尝试从最近工作区恢复。"
                        : "部分文件处理失败，可以恢复任务继续处理。"
                    }
                    action={
                      <Button
                        icon={<RedoOutlined />}
                        loading={action === "resume"}
                        disabled={Boolean(action)}
                        onClick={() => void handleResume()}
                      >
                        恢复任务
                      </Button>
                    }
                  />
                ) : null}
              </div>
            ) : jobError ? (
              <Alert
                type="error"
                showIcon
                message={jobError}
                action={
                  <Button
                    size="small"
                    onClick={() => void loadJob(announcement.lastJobId!)}
                  >
                    重试
                  </Button>
                }
              />
            ) : (
              <Typography.Text type="secondary">
                正在读取任务状态…
              </Typography.Text>
            )}
          </Spin>
        </Card>
      ) : null}

      <Card
        className={styles.matchCard}
        title="最近一次成功匹配结果"
        extra={
          announcement.lastMatchedAt ? (
            <Typography.Text type="secondary">
              {formatDateTime(announcement.lastMatchedAt)}
            </Typography.Text>
          ) : null
        }
      >
        <Spin spinning={matchResultLoading}>
          {matchResultError ? (
            <Alert
              type="error"
              showIcon
              message={matchResultError}
              action={
                <Button size="small" onClick={() => void loadMatchResult()}>
                  重试
                </Button>
              }
            />
          ) : matchResult ? (
            <>
              {announcement.lastMatchStatus !== "SUCCESS" ? (
                <Alert
                  className={styles.previousResultAlert}
                  type="warning"
                  showIcon
                  message="以下为上一次成功结果，不代表当前任务状态"
                />
              ) : null}
              <MatchResultView result={matchResult} />
            </>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="尚无匹配结果；请先在产品工作台维护产品，再运行产品匹配。"
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  status: React.ReactNode;
  timeLabel: string;
  time: string;
  error: string | null;
  action: React.ReactNode;
}

function StatusCard({
  title,
  status,
  timeLabel,
  time,
  error,
  action,
}: StatusCardProps) {
  return (
    <Card size="small" className={styles.statusCard}>
      <div className={styles.statusHeading}>
        <Typography.Title level={4}>{title}</Typography.Title>
        {status}
      </div>
      <div className={styles.statusTime}>
        <span>{timeLabel}</span>
        <strong>{time}</strong>
      </div>
      {error ? (
        <Typography.Paragraph className={styles.statusError} type="danger">
          {error}
        </Typography.Paragraph>
      ) : null}
      <div className={styles.statusAction}>{action}</div>
    </Card>
  );
}

function AsyncStatusTag({ status }: { status: AsyncOperationStatus | null }) {
  if (!status) return <Tag>未运行</Tag>;
  const meta = ASYNC_STATUS_META[status];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

function MatchResultView({ result }: { result: AnnouncementMatchResult }) {
  return (
    <div className={styles.matchResult}>
      <div className={styles.matchDecision}>
        <span
          className={result.possible ? styles.possible : styles.notPossible}
          aria-hidden="true"
        >
          {result.possible ? (
            <CheckCircleOutlined />
          ) : (
            <CloseCircleOutlined />
          )}
        </span>
        <span>
          <Typography.Title level={3}>
            {result.possible ? "建议参与" : "暂不建议参与"}
          </Typography.Title>
          <Typography.Paragraph>{result.reason}</Typography.Paragraph>
        </span>
      </div>

      <ResultGroup title="匹配产品" values={result.matchedProducts} color="cyan" />
      <ResultGroup title="命中关键词" values={result.matchedKeywords} color="blue" />
      <ResultGroup title="相关子标包" values={result.relevantSubLots} color="purple" />
      <ResultList title="支持证据" values={result.supportingEvidence} />
      <ResultList title="风险提示" values={result.risks} warning />
    </div>
  );
}

function ResultGroup({
  title,
  values,
  color,
}: {
  title: string;
  values: string[];
  color: string;
}) {
  return (
    <div className={styles.resultGroup}>
      <strong>{title}</strong>
      <Space size={[6, 6]} wrap>
        {values.length ? (
          values.map((value) => (
            <Tag color={color} key={value}>
              {value}
            </Tag>
          ))
        ) : (
          <Typography.Text type="secondary">无</Typography.Text>
        )}
      </Space>
    </div>
  );
}

function ResultList({
  title,
  values,
  warning = false,
}: {
  title: string;
  values: string[];
  warning?: boolean;
}) {
  return (
    <div className={styles.resultGroup}>
      <strong>{title}</strong>
      {values.length ? (
        <ul className={warning ? styles.riskList : undefined}>
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : (
        <Typography.Text type="secondary">无</Typography.Text>
      )}
    </div>
  );
}
