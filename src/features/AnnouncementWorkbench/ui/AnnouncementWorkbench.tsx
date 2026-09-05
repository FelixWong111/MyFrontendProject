import {
  BankOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  FileTextOutlined,
  PartitionOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Empty, Spin, Tabs, Tag, Typography } from "antd";
import dayjs from "dayjs";

import type { AnnouncementDetail } from "@/entities/Announcement/announcement";
import { AnnouncementFilesWorkspace } from "@/features/AnnouncementWorkbench/ui/AnnouncementFilesWorkspace";
import { EditAnnouncementDrawer } from "@/features/Edit-Announcement/ui/EditAnnouncementDrawer";
import { SubLotManager } from "@/features/Manage-SubLots/ui/SubLotManager";
import { AnnouncementProcessingWorkspace } from "@/features/Process-Announcement/ui/AnnouncementProcessingWorkspace";
import { formatDateTime } from "@/shared/lib/format";

import styles from "./AnnouncementWorkbench.module.css";

interface AnnouncementWorkbenchProps {
  announcement: AnnouncementDetail | null;
  loading: boolean;
  error: string;
  fileListRefreshKey: number;
  onAnnouncementUpdated: (announcement: AnnouncementDetail) => void;
  onAnnouncementSnapshot: (announcement: AnnouncementDetail) => void;
  onRefreshAnnouncement: () => void;
  onRefreshFiles: () => void;
  onStateMayHaveChanged: () => void;
}

function getDeadlineCopy(deadline: string | null) {
  if (!deadline) {
    return { value: "未设置", note: "可在公告详情中补充", urgent: false };
  }

  const target = dayjs(deadline).startOf("day");
  const days = target.diff(dayjs().startOf("day"), "day");

  if (days < 0) {
    return { value: deadline, note: `已截止 ${Math.abs(days)} 天`, urgent: true };
  }
  if (days === 0) {
    return { value: deadline, note: "今天截止", urgent: true };
  }
  return { value: deadline, note: `剩余 ${days} 天`, urgent: days <= 3 };
}

export function AnnouncementWorkbench({
  announcement,
  loading,
  error,
  fileListRefreshKey,
  onAnnouncementUpdated,
  onAnnouncementSnapshot,
  onRefreshAnnouncement,
  onRefreshFiles,
  onStateMayHaveChanged,
}: AnnouncementWorkbenchProps) {
  if (!announcement) {
    return (
      <Card className={styles.emptyCard} variant="borderless">
        {error ? (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={onRefreshAnnouncement}>
                重试
              </Button>
            }
          />
        ) : (
          <Spin spinning={loading} tip="正在读取公告详情...">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={loading ? "正在载入公告" : "请从右侧选择或新建公告"}
            />
          </Spin>
        )}
      </Card>
    );
  }

  const detail = announcement.detail;
  const deadline = getDeadlineCopy(detail.deadline);

  return (
    <section className={styles.workbench}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroCopy}>
            <div className={styles.statusRow}>
              <Tag color="cyan">公告工作台</Tag>
              <Typography.Text copyable={{ text: announcement.id }} code>
                {announcement.id}
              </Typography.Text>
            </div>
            <Typography.Title level={1}>{announcement.name}</Typography.Title>
            <Typography.Paragraph>
              在同一处维护公告信息、子标包与附件，并直接核对 PDF 或 Word 原文。
            </Typography.Paragraph>
          </div>
          <EditAnnouncementDrawer
            announcement={announcement}
            onUpdated={onAnnouncementUpdated}
            onStateMayHaveChanged={onStateMayHaveChanged}
          />
        </div>

        <div className={styles.metrics}>
          <Metric
            icon={<CodeOutlined />}
            label="项目编号"
            value={detail.projectCode ?? "未填写"}
            note="自定义项目标识"
          />
          <Metric
            icon={<CalendarOutlined />}
            label="截止日期"
            value={deadline.value}
            note={deadline.note}
            urgent={deadline.urgent}
          />
          <Metric
            icon={<PartitionOutlined />}
            label="子标包"
            value={`${detail.subLotIds.length} 个`}
            note="按当前展示顺序统计"
          />
          <Metric
            icon={<FileTextOutlined />}
            label="公告附件"
            value={`${announcement.files.length} 个`}
            note="已挂接到当前公告"
          />
        </div>

        <div className={styles.detailGrid}>
          <DetailItem
            icon={<BankOutlined />}
            label="招标机构"
            values={detail.tenderers}
          />
          <DetailItem
            icon={<SafetyCertificateOutlined />}
            label="代理机构"
            values={detail.agents}
          />
        </div>

        <div className={styles.qualificationRow}>
          <span className={styles.qualificationLabel}>
            <SafetyCertificateOutlined /> 通用资格要求
          </span>
          <div className={styles.tags}>
            {detail.qualifications.length ? (
              detail.qualifications.map((qualification) => (
                <Tag key={qualification}>{qualification}</Tag>
              ))
            ) : (
              <Typography.Text type="secondary">尚未填写</Typography.Text>
            )}
          </div>
        </div>

        <div className={styles.modifiedTime}>
          <ClockCircleOutlined /> 最后修改：
          {formatDateTime(announcement.lastModifiedTime)}
        </div>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={onRefreshAnnouncement}>
              重试
            </Button>
          }
        />
      ) : null}

      <Card className={styles.workspaceCard} variant="borderless">
        <Spin spinning={loading} tip="正在同步公告数据...">
          <Tabs
            defaultActiveKey="processing"
            items={[
              {
                key: "processing",
                label: (
                  <span>
                    <RobotOutlined /> 清理与匹配
                  </span>
                ),
                children: (
                  <AnnouncementProcessingWorkspace
                    announcement={announcement}
                    onAnnouncementSnapshot={onAnnouncementSnapshot}
                    onStateMayHaveChanged={onStateMayHaveChanged}
                  />
                ),
              },
              {
                key: "sub-lots",
                label: `子标包（${detail.subLotIds.length}）`,
                children: (
                  <SubLotManager
                    announcement={announcement}
                    onAnnouncementUpdated={onAnnouncementUpdated}
                    onStateMayHaveChanged={onStateMayHaveChanged}
                  />
                ),
              },
              {
                key: "files",
                label: `文件与预览（${announcement.files.length}）`,
                children: (
                  <AnnouncementFilesWorkspace
                    announcement={announcement}
                    announcementLoading={loading}
                    announcementError={error}
                    fileListRefreshKey={fileListRefreshKey}
                    onAnnouncementUpdated={onAnnouncementUpdated}
                    onRefreshAnnouncement={onRefreshAnnouncement}
                    onRefreshFiles={onRefreshFiles}
                    onStateMayHaveChanged={onStateMayHaveChanged}
                  />
                ),
              },
            ]}
          />
        </Spin>
      </Card>
    </section>
  );
}

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  urgent?: boolean;
}

function Metric({ icon, label, value, note, urgent = false }: MetricProps) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricIcon}>{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <em className={urgent ? styles.urgent : ""}>{note}</em>
      </span>
    </div>
  );
}

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  values: string[];
}

function DetailItem({ icon, label, values }: DetailItemProps) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailIcon}>{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{values.length ? values.join("、") : "未填写"}</strong>
      </span>
    </div>
  );
}
