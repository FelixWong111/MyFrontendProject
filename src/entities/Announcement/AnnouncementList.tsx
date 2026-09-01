import {
  ClockCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilterOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Input,
  List,
  Pagination,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import { useState } from "react";

import type {
  AnnouncementListEntry,
  AnnouncementSearchParams,
} from "@/entities/Announcement/announcement";
import { formatDateTime } from "@/shared/lib/format";

import styles from "./AnnouncementList.module.css";

interface AnnouncementListProps {
  announcements: AnnouncementListEntry[];
  error: string;
  loading: boolean;
  selectedAnnouncementId: string | null;
  searchActive: boolean;
  searchPage: number;
  searchSize: number;
  searchTotal: number;
  onClearSearch: () => void;
  onDelete: (announcement: AnnouncementListEntry) => Promise<void>;
  onRetry: () => void;
  onSearch: (params: AnnouncementSearchParams) => void;
  onSearchPageChange: (page: number) => void;
  onSelect: (announcement: AnnouncementListEntry) => void;
}

type DateRange = [Dayjs | null, Dayjs | null] | null;

function getHitLabel(path: string) {
  if (path === "name") return "公告名称";
  if (path === "detail.projectCode") return "项目编号";
  if (path.startsWith("detail.tenderers")) return "招标机构";
  if (path.startsWith("detail.agents")) return "代理机构";
  if (path.startsWith("detail.qualifications")) return "通用资格";
  if (path.endsWith(".name")) return "子标包名称";
  if (path.endsWith(".estimatedAmountNote")) return "预估金额说明";
  if (path.endsWith(".maxPriceNote")) return "最高限价说明";
  if (path.endsWith(".depositNote")) return "保证金说明";
  if (path.includes(".qualifications[")) return "子标包资格";
  return path;
}

export function AnnouncementList({
  announcements,
  error,
  loading,
  selectedAnnouncementId,
  searchActive,
  searchPage,
  searchSize,
  searchTotal,
  onClearSearch,
  onDelete,
  onRetry,
  onSearch,
  onSearchPageChange,
  onSelect,
}: AnnouncementListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [keywords, setKeywords] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [deadlineRange, setDeadlineRange] = useState<DateRange>(null);
  const [modifiedRange, setModifiedRange] = useState<DateRange>(null);
  const [validationError, setValidationError] = useState("");

  const handleDelete = async (announcement: AnnouncementListEntry) => {
    if (deletingId) {
      return;
    }

    setDeletingId(announcement.id);
    try {
      await onDelete(announcement);
    } catch {
      // 上层负责依据 API 错误码展示反馈。
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = (searchValue: string) => {
    const normalizedKeywords = searchValue.trim().replace(/\s+/gu, " ");
    const keywordParts = normalizedKeywords
      ? [...new Set(normalizedKeywords.split(" "))]
      : [];

    if (keywordParts.length === 0) {
      setValidationError("请输入至少一个查询关键词。日期条件不能单独查询。");
      return;
    }

    if (keywordParts.length > 20) {
      setValidationError("一次最多查询 20 个关键词。");
      return;
    }

    if (keywordParts.some((keyword) => keyword.length > 100)) {
      setValidationError("每个关键词不能超过 100 个字符。");
      return;
    }

    setValidationError("");
    onSearch({
      keywords: keywordParts.join(" "),
      deadlineFrom: deadlineRange?.[0]?.format("YYYY-MM-DD"),
      deadlineTo: deadlineRange?.[1]?.format("YYYY-MM-DD"),
      modifiedFrom: modifiedRange?.[0]?.format("YYYY-MM-DD"),
      modifiedTo: modifiedRange?.[1]?.format("YYYY-MM-DD"),
    });
  };

  const handleClearSearch = () => {
    setKeywords("");
    setDeadlineRange(null);
    setModifiedRange(null);
    setValidationError("");
    onClearSearch();
  };

  const hasDateFilters = Boolean(
    deadlineRange?.some(Boolean) || modifiedRange?.some(Boolean),
  );

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <div className={styles.searchPanel}>
        <Input.Search
          allowClear
          aria-label="查询公告"
          enterButton="查询"
          loading={loading && searchActive}
          placeholder="公告、项目编号、机构或子标包"
          status={validationError ? "error" : undefined}
          value={keywords}
          onChange={(event) => {
            const nextKeywords = event.target.value;
            if (searchActive && nextKeywords === "") {
              handleClearSearch();
              return;
            }
            setKeywords(nextKeywords);
            if (validationError) setValidationError("");
          }}
          onSearch={(value, _event, info) => {
            if (info?.source === "clear") {
              setKeywords("");
              setValidationError("");
              if (searchActive) onClearSearch();
              return;
            }
            handleSearch(value);
          }}
        />

        {validationError ? (
          <Typography.Text className={styles.validationError} type="danger">
            {validationError}
          </Typography.Text>
        ) : null}

        <div className={styles.searchActions}>
          <Button
            type="link"
            size="small"
            icon={<FilterOutlined />}
            aria-expanded={filtersVisible}
            onClick={() => setFiltersVisible((visible) => !visible)}
          >
            日期筛选{hasDateFilters ? "（已设置）" : ""}
          </Button>
          {searchActive ? (
            <Button type="link" size="small" onClick={handleClearSearch}>
              清除查询
            </Button>
          ) : null}
        </div>

        {filtersVisible ? (
          <div className={styles.dateFilters}>
            <label>
              <span>投标截止日期</span>
              <DatePicker.RangePicker
                allowEmpty={[true, true]}
                format="YYYY-MM-DD"
                placeholder={["开始日期", "结束日期"]}
                size="small"
                value={deadlineRange}
                onChange={(dates) => setDeadlineRange(dates)}
              />
            </label>
            <label>
              <span>最后修改日期（UTC）</span>
              <DatePicker.RangePicker
                allowEmpty={[true, true]}
                format="YYYY-MM-DD"
                placeholder={["开始日期", "结束日期"]}
                size="small"
                value={modifiedRange}
                onChange={(dates) => setModifiedRange(dates)}
              />
            </label>
          </div>
        ) : null}

        {searchActive && !error ? (
          <div className={styles.searchSummary}>
            <SearchOutlined />
            <span>
              {loading ? "正在查询公告..." : `查询到 ${searchTotal} 个公告`}
            </span>
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={onRetry}>
              重试
            </Button>
          }
        />
      ) : null}
      <List<AnnouncementListEntry>
        className={styles.list}
        dataSource={announcements}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchActive
                  ? "没有符合当前条件的公告"
                  : "暂无公告，请先新建公告"
              }
            />
          ),
        }}
        renderItem={(announcement) => {
          const selected = selectedAnnouncementId === announcement.id;
          const searchHits =
            "hits" in announcement
              ? Object.entries(announcement.hits)
              : [];
          const firstSearchHit = searchHits[0];
          return (
            <List.Item className={styles.item}>
              <div
                className={`${styles.announcementCard} ${
                  selected ? styles.selected : ""
                }`}
                role="button"
                tabIndex={0}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(announcement)}
                onKeyDown={(event) => {
                  if (event.currentTarget !== event.target) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(announcement);
                  }
                }}
              >
                <div className={styles.cardHeading}>
                  <span className={styles.documentIcon} aria-hidden="true">
                    <FileTextOutlined />
                  </span>
                  <Typography.Text className={styles.name} ellipsis>
                    {announcement.name}
                  </Typography.Text>
                  <div onClick={(event) => event.stopPropagation()}>
                    <Popconfirm
                      title="删除公告"
                      description="将删除公告、详情及全部子标包；已上传文件不会被删除。"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(announcement)}
                    >
                      <Button
                        danger
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        aria-label={`删除${announcement.name}`}
                        loading={deletingId === announcement.id}
                      />
                    </Popconfirm>
                  </div>
                </div>

                <div className={styles.metaRow}>
                  {"fileCount" in announcement ? (
                    <Tag>{announcement.fileCount} 个文件</Tag>
                  ) : (
                    <Tag color="blue">命中 {searchHits.length} 个字段</Tag>
                  )}
                  {announcement.lastJobId ? (
                    <Tag color="cyan">已有处理任务</Tag>
                  ) : (
                    <Tag>尚未处理</Tag>
                  )}
                </div>

                {firstSearchHit ? (
                  <div className={styles.hitSummary}>
                    <div className={styles.hitHeading}>
                      <span>{getHitLabel(firstSearchHit[0])}</span>
                      {firstSearchHit[1].matchedKeywords
                        .slice(0, 3)
                        .map((keyword) => (
                          <Tag color="cyan" key={keyword}>
                            {keyword}
                          </Tag>
                        ))}
                    </div>
                    <Typography.Paragraph
                      className={styles.hitValue}
                      ellipsis={{ rows: 2, tooltip: firstSearchHit[1].value }}
                    >
                      {firstSearchHit[1].value}
                    </Typography.Paragraph>
                    {searchHits.length > 1 ? (
                      <span className={styles.moreHits}>
                        另有 {searchHits.length - 1} 个命中字段
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.timeRow}>
                  <ClockCircleOutlined />
                  <span>{formatDateTime(announcement.lastModifiedTime)}</span>
                </div>
              </div>
            </List.Item>
          );
        }}
      />

      {searchActive && searchTotal > searchSize ? (
        <Pagination
          align="center"
          current={searchPage}
          pageSize={searchSize}
          responsive
          showSizeChanger={false}
          simple
          size="small"
          total={searchTotal}
          onChange={onSearchPageChange}
        />
      ) : null}
    </Space>
  );
}
